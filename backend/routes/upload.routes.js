import express from "express";
import multer from "multer";
import { authAdmin } from "../middleware/auth.js";
import { parseUploadedFile } from "../utils/parseFile.js";
import PpaSnapshot from "../models/PpaSnapshot.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/", authAdmin, upload.single("file"), async (req, res) => {
  try {
    const { date, mode = "create" } = req.body || {};

    if (!date) {
      return res.status(400).json({ error: "A data é obrigatória." });
    }

    if (!req.file) {
      return res.status(400).json({ error: "Arquivo não enviado." });
    }

    const parsed = parseUploadedFile(req.file.buffer, req.file.originalname, date);
    const existing = await PpaSnapshot.findOne({ date });

    if (mode === "create" && existing) {
      return res.status(409).json({
        error: "Já existe aderência para esta data. Use o modo atualizar."
      });
    }

    if (existing) {
      existing.label = parsed.label;
      existing.sourceType = parsed.sourceType;
      existing.regionalDefault = parsed.regionalDefault;
      existing.totalRow = parsed.totalRow;
      existing.stores = parsed.stores;
      existing.createdBy = req.user.userId;
      await existing.save();

      return res.json({
        ok: true,
        message: "Aderência atualizada com sucesso.",
        date: existing.date
      });
    }

    const created = await PpaSnapshot.create({
      ...parsed,
      createdBy: req.user.userId
    });

    return res.json({
      ok: true,
      message: "Aderência criada com sucesso.",
      date: created.date
    });
  } catch (error) {
    console.error("Erro no upload:", error);
    return res.status(500).json({
      error: error.message || "Erro ao processar upload."
    });
  }
});

export default router;