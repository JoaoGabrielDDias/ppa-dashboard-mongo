import dns from "node:dns";
import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../models/User.js";

dns.setServers(["1.1.1.1", "8.8.8.8"]);
dotenv.config();

async function run() {
  try {
    const MONGODB_URI = String(process.env.MONGODB_URI || "").trim();

    if (!MONGODB_URI.startsWith("mongodb://") && !MONGODB_URI.startsWith("mongodb+srv://")) {
      throw new Error("MONGODB_URI inválida no .env");
    }

    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 15000
    });

    const username = process.env.ADMIN_USER || "admin";
    const password = process.env.ADMIN_PASS || "123456";

    const exists = await User.findOne({ username });
    if (exists) {
      console.log("Admin já existe.");
      process.exit(0);
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await User.create({
      username,
      passwordHash,
      role: "admin"
    });

    console.log("Admin criado com sucesso.");
    process.exit(0);
  } catch (error) {
    console.error("Erro ao criar admin:", error);
    process.exit(1);
  }
}

run();