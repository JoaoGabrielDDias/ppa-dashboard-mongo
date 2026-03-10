import mongoose from "mongoose";

const storeRowSchema = new mongoose.Schema(
  {
    loja: { type: String, required: true, trim: true },
    regional: { type: String, default: "", trim: true },
    qtdModeloPPA: { type: Number, default: 0 },
    qtdModeloConcluido: { type: Number, default: 0 },
    aderencia: { type: Number, default: 0 },
    status: { type: String, default: "", trim: true }
  },
  { _id: false }
);

const ppaSnapshotSchema = new mongoose.Schema(
  {
    date: {
      type: String,
      required: true,
      unique: true
    },
    label: {
      type: String,
      required: true
    },
    sourceType: {
      type: String,
      enum: ["csv", "xlsx"],
      required: true
    },
    regionalDefault: {
      type: String,
      default: "Guardiões da Fronteira"
    },
    totalRow: {
      type: storeRowSchema,
      default: null
    },
    stores: {
      type: [storeRowSchema],
      default: []
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  },
  { timestamps: true }
);

export default mongoose.model("PpaSnapshot", ppaSnapshotSchema);