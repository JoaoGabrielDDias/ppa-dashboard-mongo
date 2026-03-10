import dns from "node:dns";
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

dns.setServers(["1.1.1.1", "8.8.8.8"]);
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FRONTEND_DIR = path.join(__dirname, "../frontend");
const INDEX_FILE = path.join(FRONTEND_DIR, "index.html");
const ADMIN_FILE = path.join(FRONTEND_DIR, "admin.html");

const app = express();
const PORT = Number(process.env.PORT || 3000);
const MONGODB_URI = String(process.env.MONGODB_URI || "").trim();

console.log("Iniciando servidor...");
console.log("PORT:", PORT);
console.log("FRONTEND_DIR:", FRONTEND_DIR);
console.log("Frontend existe?", fs.existsSync(FRONTEND_DIR));
console.log("Index existe?", fs.existsSync(INDEX_FILE));
console.log("Admin existe?", fs.existsSync(ADMIN_FILE));

if (!MONGODB_URI.startsWith("mongodb://") && !MONGODB_URI.startsWith("mongodb+srv://")) {
  throw new Error("MONGODB_URI inválida nas variáveis de ambiente.");
}

app.use(cors({
  origin: process.env.FRONTEND_ORIGIN || "*"
}));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, message: "API online" });
});

app.use("/api/auth", authRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/dashboard", dashboardRoutes);

if (fs.existsSync(FRONTEND_DIR)) {
  app.use(express.static(FRONTEND_DIR));

  app.get("/", (_req, res) => {
    if (!fs.existsSync(INDEX_FILE)) {
      return res.status(500).send("index.html não encontrado no servidor.");
    }
    res.sendFile(INDEX_FILE);
  });

  app.get("/admin", (_req, res) => {
    if (!fs.existsSync(ADMIN_FILE)) {
      return res.status(500).send("admin.html não encontrado no servidor.");
    }
    res.sendFile(ADMIN_FILE);
  });

  app.get("/admin.html", (_req, res) => {
    if (!fs.existsSync(ADMIN_FILE)) {
      return res.status(500).send("admin.html não encontrado no servidor.");
    }
    res.sendFile(ADMIN_FILE);
  });

  app.get("/index.html", (_req, res) => {
    if (!fs.existsSync(INDEX_FILE)) {
      return res.status(500).send("index.html não encontrado no servidor.");
    }
    res.sendFile(INDEX_FILE);
  });
} else {
  app.get("/", (_req, res) => {
    res.send("API online, mas pasta frontend não encontrada no deploy.");
  });

  app.get("/admin", (_req, res) => {
    res.send("Área admin indisponível: frontend não encontrado no deploy.");
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

mongoose.connect(MONGODB_URI, {
  serverSelectionTimeoutMS: 15000
})
  .then(() => {
    console.log("MongoDB conectado com sucesso.");
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Servidor rodando na porta ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Erro ao conectar no MongoDB:", err);
    process.exit(1);
  });