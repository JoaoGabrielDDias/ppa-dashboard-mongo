import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cors from "cors";

import authRoutes from "./routes/auth.routes.js";
import uploadRoutes from "./routes/upload.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FRONTEND_DIR = path.join(__dirname, "../frontend");
const INDEX_FILE = path.join(FRONTEND_DIR, "index.html");
const ADMIN_FILE = path.join(FRONTEND_DIR, "admin.html");

const app = express();
const PORT = Number(process.env.PORT || 3000);
const MONGODB_URI = String(process.env.MONGODB_URI || "").trim();

let mongoReady = false;
let mongoError = "";

console.log("Iniciando aplicação...");
console.log("PORT:", PORT);
console.log("FRONTEND_DIR:", FRONTEND_DIR);
console.log("Frontend existe?", fs.existsSync(FRONTEND_DIR));
console.log("Index existe?", fs.existsSync(INDEX_FILE));
console.log("Admin existe?", fs.existsSync(ADMIN_FILE));
console.log("MONGODB_URI definida?", Boolean(MONGODB_URI));

app.use(cors({
  origin: process.env.FRONTEND_ORIGIN || "*"
}));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    message: "API online",
    mongoReady,
    mongoError
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/dashboard", dashboardRoutes);

if (fs.existsSync(FRONTEND_DIR)) {
  app.use(express.static(FRONTEND_DIR));

  app.get("/", (_req, res) => {
    if (!fs.existsSync(INDEX_FILE)) {
      return res.status(500).send("index.html não encontrado.");
    }
    return res.sendFile(INDEX_FILE);
  });

  app.get("/admin", (_req, res) => {
    if (!fs.existsSync(ADMIN_FILE)) {
      return res.status(500).send("admin.html não encontrado.");
    }
    return res.sendFile(ADMIN_FILE);
  });

  app.get("/admin.html", (_req, res) => {
    if (!fs.existsSync(ADMIN_FILE)) {
      return res.status(500).send("admin.html não encontrado.");
    }
    return res.sendFile(ADMIN_FILE);
  });
} else {
  app.get("/", (_req, res) => {
    return res.send("API online, mas frontend não encontrado no deploy.");
  });
}

app.use((req, res) => {
  if (req.path.startsWith("/api")) {
    return res.status(404).json({ error: "Rota não encontrada." });
  }
  return res.status(404).send("Página não encontrada.");
});

app.use((err, req, res, _next) => {
  console.error("Erro global:", err);

  if (req.path.startsWith("/api")) {
    return res.status(500).json({ error: "Erro interno no servidor." });
  }
  return res.status(500).send("Erro interno no servidor.");
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

if (!MONGODB_URI) {
  mongoError = "MONGODB_URI não definida.";
  console.error(mongoError);
} else if (
  !MONGODB_URI.startsWith("mongodb://") &&
  !MONGODB_URI.startsWith("mongodb+srv://")
) {
  mongoError = "MONGODB_URI inválida.";
  console.error(mongoError);
} else {
  mongoose.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 15000
  })
    .then(() => {
      mongoReady = true;
      mongoError = "";
      console.log("MongoDB conectado com sucesso.");
    })
    .catch((err) => {
      mongoReady = false;
      mongoError = err.message;
      console.error("Erro ao conectar no MongoDB:", err);
    });
}