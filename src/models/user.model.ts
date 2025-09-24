import { Schema, model } from "mongoose";
import { IUser } from "../interface/models";

const userSchema = new Schema<IUser>({
  collaterals: [{ type: String }],
  walletIds: [{ type: String }],
  borrowRecords: [{ type: String }],
  poolRecords: [{ type: String }]
}, {
  timestamps: true
});

export const User = model<IUser>("User", userSchema);