import { Schema, model } from "mongoose";
import { IBorrowRecord } from "../interface/models";

const borrowRecordSchema = new Schema<IBorrowRecord>({
  amount: { type: Number, required: true },
  chain: { type: String, required: true },
  borrowTxHash: { type: String, required: true },
  associatedCollaterals: [{ type: String }],
  associatedPools: [{ type: String }],
  associatedRepays: [{ type: String }],
  borrowedBy: { type: String, required: true }
}, {
  timestamps: true
});

export const BorrowRecord = model<IBorrowRecord>("BorrowRecord", borrowRecordSchema);