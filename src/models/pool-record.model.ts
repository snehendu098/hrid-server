import { Schema, model } from "mongoose";
import { IPoolRecord } from "../interface/models";

const poolRecordSchema = new Schema<IPoolRecord>({
  amount: { type: Number, required: true },
  chain: { type: String, required: true },
  depositTxHash: { type: String, required: true },
  depositedBy: { type: String, required: true },
  amountLocked: { type: Number, required: true },
  withdrawn: { type: Number, required: true },
  endDate: { type: Date, required: true }
}, {
  timestamps: true
});

export const PoolRecord = model<IPoolRecord>("PoolRecord", poolRecordSchema);