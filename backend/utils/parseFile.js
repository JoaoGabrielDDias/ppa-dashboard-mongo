import XLSX from "xlsx";
import { parse } from "csv-parse/sync";

function normalizeKey(key = "") {
  return String(key)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function cleanCell(value) {
  return String(value ?? "").trim();
}

function parseNumber(value) {
  if (value == null) return 0;

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  let v = String(value).trim();
  if (!v) return 0;

  v = v.replace(/\s/g, "");

  if (v.includes(",") && v.includes(".")) {
    v = v.replace(/\./g, "").replace(",", ".");
  } else if (v.includes(",")) {
    v = v.replace(",", ".");
  }

  const n = Number(v.replace("%", ""));
  return Number.isFinite(n) ? n : 0;
}

function parsePercent(value) {
  if (value == null) return 0;

  if (typeof value === "number") {
    if (!Number.isFinite(value)) return 0;
    return value > 0 && value <= 1 ? value * 100 : value;
  }

  let v = String(value).trim();
  if (!v) return 0;

  const hasPercent = v.includes("%");
  v = v.replace("%", "").replace(/\s/g, "");

  if (v.includes(",") && v.includes(".")) {
    v = v.replace(/\./g, "").replace(",", ".");
  } else if (v.includes(",")) {
    v = v.replace(",", ".");
  }

  let n = Number(v);
  if (!Number.isFinite(n)) return 0;

  // Se veio como decimal de percentual no XLSX, converte para escala 0-100
  if (!hasPercent && n > 0 && n <= 1) {
    n = n * 100;
  }

  return n;
}

function getByAliases(row, aliases) {
  const normalizedRow = {};

  Object.entries(row).forEach(([key, value]) => {
    normalizedRow[normalizeKey(key)] = value;
  });

  for (const alias of aliases) {
    const found = normalizedRow[normalizeKey(alias)];
    if (found !== undefined) return found;
  }

  return "";
}

function dateToLabel(date) {
  const [yyyy, mm, dd] = String(date).split("-");
  return `${dd}/${mm}/${yyyy}`;
}

function isIgnoredMatrixRow(values) {
  const joined = values.map(v => cleanCell(v).toLowerCase()).join(" | ");

  if (!joined) return true;
  if (joined.includes("filtros aplicados")) return true;
  if (joined.includes("aplicar filtro")) return true;
  if (joined.includes("des_time_loja é")) return true;

  return false;
}

function isGuardioesStore251(loja, regional) {
  return String(loja).trim() === "251" &&
    normalizeKey(regional) === normalizeKey("Guardiões da Fronteira");
}

function detectHeaderIndex(matrix) {
  return matrix.findIndex((row) => {
    const values = row.map(v => normalizeKey(v));
    const joined = values.join(" | ");

    const hasLoja = values.includes("loja");
    const hasQtdPpa = joined.includes("qtd modelocor ppa");
    const hasQtdConcluido = joined.includes("qtd modelocor concluido");
    const hasAderencia = joined.includes("aderencia ao plano");

    return hasLoja && hasQtdPpa && hasQtdConcluido && hasAderencia;
  });
}

function makeUniqueHeaders(headerRow) {
  const used = new Map();

  return headerRow.map((cell, idx) => {
    let header = cleanCell(cell);
    if (!header) header = `col_${idx}`;

    const key = normalizeKey(header);
    const count = used.get(key) || 0;
    used.set(key, count + 1);

    return count === 0 ? header : `${header}_${count + 1}`;
  });
}

function matrixToObjects(matrix) {
  const headerIndex = detectHeaderIndex(matrix);

  if (headerIndex === -1) {
    throw new Error("Não foi possível identificar o cabeçalho do XLSX.");
  }

  const headers = makeUniqueHeaders(matrix[headerIndex]);
  const rows = [];

  for (let i = headerIndex + 1; i < matrix.length; i++) {
    const row = matrix[i] || [];
    if (isIgnoredMatrixRow(row)) continue;

    const values = row.map(v => v ?? "");
    const obj = {};

    headers.forEach((header, idx) => {
      obj[header] = values[idx] ?? "";
    });

    rows.push(obj);
  }

  return rows;
}

function extractStatus(row) {
  return cleanCell(
    getByAliases(row, [
      "Status PPA",
      "STATUS PPA",
      "status ppa",
      "Status",
      "STATUS",
      "status"
    ])
  );
}

function extractTotalRow(rawRows) {
  for (const row of rawRows) {
    const loja = cleanCell(getByAliases(row, ["Loja", "LOJA", "loja"]));
    if (loja.toLowerCase() !== "total") continue;

    return {
      loja: "Total",
      regional: cleanCell(getByAliases(row, ["des_time_loja", "regional"])) || "Guardiões da Fronteira",
      qtdModeloPPA: parseNumber(
        getByAliases(row, ["Qtd ModeloCor PPA", "QTD MODELOCOR PPA", "Qtd Modelo Cor PPA"])
      ),
      qtdModeloConcluido: parseNumber(
        getByAliases(row, [
          "Qtd ModeloCor Concluído",
          "Qtd ModeloCor Concluido",
          "QTD MODELOCOR CONCLUÍDO",
          "QTD MODELOCOR CONCLUIDO"
        ])
      ),
      aderencia: parsePercent(
        getByAliases(row, [
          "Aderência ao Plano [%]",
          "Aderencia ao Plano [%]",
          "ADERÊNCIA AO PLANO [%]",
          "ADERENCIA AO PLANO [%]"
        ])
      ),
      status: extractStatus(row)
    };
  }

  return null;
}

function normalizeRows(rawRows, date, sourceType) {
  const totalRow = extractTotalRow(rawRows);

  const stores = rawRows
    .map((row) => {
      const regional = cleanCell(
        getByAliases(row, ["des_time_loja", "DES_TIME_LOJA", "regional", "Regional"])
      );

      const loja = cleanCell(
        getByAliases(row, ["Loja", "LOJA", "loja"])
      );

      const qtdModeloPPA = parseNumber(
        getByAliases(row, [
          "Qtd ModeloCor PPA",
          "QTD MODELOCOR PPA",
          "Qtd Modelo Cor PPA"
        ])
      );

      const qtdModeloConcluido = parseNumber(
        getByAliases(row, [
          "Qtd ModeloCor Concluído",
          "Qtd ModeloCor Concluido",
          "QTD MODELOCOR CONCLUÍDO",
          "QTD MODELOCOR CONCLUIDO"
        ])
      );

      const aderencia = parsePercent(
        getByAliases(row, [
          "Aderência ao Plano [%]",
          "Aderencia ao Plano [%]",
          "ADERÊNCIA AO PLANO [%]",
          "ADERENCIA AO PLANO [%]"
        ])
      );

      const status = extractStatus(row);

      return {
        loja,
        regional,
        qtdModeloPPA,
        qtdModeloConcluido,
        aderencia,
        status
      };
    })
    .filter(row => row.loja)
    .filter(row => row.loja.toLowerCase() !== "total")
    .filter(row => !isGuardioesStore251(row.loja, row.regional));

  return {
    date,
    label: dateToLabel(date),
    sourceType,
    regionalDefault: "Guardiões da Fronteira",
    totalRow,
    stores
  };
}

function readCsvSmart(fileBuffer) {
  const text = fileBuffer.toString("utf-8");

  return parse(text, {
    columns: true,
    skip_empty_lines: true
  });
}

function readXlsxSmart(fileBuffer) {
  const workbook = XLSX.read(fileBuffer, { type: "buffer" });
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];

  const matrix = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    blankrows: false,
    raw: true
  });

  return matrixToObjects(matrix);
}

export function parseUploadedFile(fileBuffer, originalname, date) {
  const lowerName = String(originalname || "").toLowerCase();
  const isCsv = lowerName.endsWith(".csv");
  const isXlsx = lowerName.endsWith(".xlsx");

  if (!isCsv && !isXlsx) {
    throw new Error("Envie um arquivo CSV ou XLSX.");
  }

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("Data inválida. Use o formato YYYY-MM-DD.");
  }

  const rows = isCsv ? readCsvSmart(fileBuffer) : readXlsxSmart(fileBuffer);

  return normalizeRows(rows, date, isCsv ? "csv" : "xlsx");
}