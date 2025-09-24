import { Schema, model } from "mongoose";
import { IRepayRecord } from "../interface/models";

const repayRecordSchema = new Schema<IRepayRecord>({
  amount: { type: Number, required: true },
  chain: { type: String, required: true },
  associatedBorrow: { type: String, required: true }
}, {
  timestamps: true
});

export const RepayRecord = model<IRepayRecord>("RepayRecord", repayRecordSchema);