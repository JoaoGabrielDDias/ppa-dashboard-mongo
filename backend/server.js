import dns from "node:dns";
import path from "node:path";
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

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_ORIGIN || "*"
}));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

const MONGODB_URI = String(process.env.MONGODB_URI || "").trim();
const PORT = process.env.PORT || 3000;

if (!MONGODB_URI.startsWith("mongodb://") && !MONGODB_URI.startsWith("mongodb+srv://")) {
  throw new Error("MONGODB_URI inválida no .env");
}

/* ---------- API ---------- */
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, message: "API online" });
});

app.use("/api/auth", authRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/dashboard", dashboardRoutes);

/* ---------- FRONTEND ---------- */
app.use(express.static(FRONTEND_DIR));

app.get("/", (_req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, "index.html"));
});

app.get("/admin", (_req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, "admin.html"));
});

app.get("/admin.html", (_req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, "admin.html"));
});

app.get("/index.html", (_req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, "index.html"));
});

/* ---------- 404 ---------- */
app.use((req, res) => {
  if (req.path.startsWith("/api")) {
    return res.status(404).json({ error: "Rota não encontrada." });
  }

  return res.status(404).send("Página não encontrada.");
});

/* ---------- ERROR ---------- */
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
    app.listen(PORT, () => {
      console.log(`Servidor rodando em http://localhost:${PORT}`);
      console.log(`Dashboard: http://localhost:${PORT}/`);
      console.log(`Admin: http://localhost:${PORT}/admin`);
    });
  })
  .catch((err) => {
    console.error("Erro ao conectar no MongoDB:", err);
    process.exit(1);
  });

  