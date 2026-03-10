import express from "express";
import PpaSnapshot from "../models/PpaSnapshot.js";

const router = express.Router();

router.get("/dates", async (_req, res) => {
  try {
    const docs = await PpaSnapshot.find({}, { date: 1, label: 1 })
      .sort({ date: 1 })
      .lean();

    res.json(docs);
  } catch (error) {
    console.error("Erro ao buscar datas:", error);
    res.status(500).json({ error: "Erro ao buscar datas." });
  }
});

router.get("/snapshot/:date", async (req, res) => {
  try {
    const doc = await PpaSnapshot.findOne({ date: req.params.date }).lean();

    if (!doc) {
      return res.status(404).json({ error: "Aderência não encontrada." });
    }

    res.json(doc);
  } catch (error) {
    console.error("Erro ao buscar snapshot:", error);
    res.status(500).json({ error: "Erro ao buscar aderência." });
  }
});

router.get("/all", async (_req, res) => {
  try {
    const docs = await PpaSnapshot.find({})
      .sort({ date: 1 })
      .lean();

    res.json(docs);
  } catch (error) {
    console.error("Erro ao buscar dashboard:", error);
    res.status(500).json({ error: "Erro ao buscar dashboard." });
  }
});

export default router;