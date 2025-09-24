import { Schema, model } from "mongoose";
import { IWallet } from "../interface/models";

const walletSchema = new Schema<IWallet>({
  walletAddress: { type: String, required: true },
  chain: { type: String, required: true },
  userId: { type: String, required: true }
}, {
  timestamps: true
});

export const Wallet = model<IWallet>("Wallet", walletSchema);