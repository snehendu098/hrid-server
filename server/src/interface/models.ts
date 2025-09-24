import { Document } from "mongoose";

export interface IUser extends Document {
  collaterals: string[];
  walletIds: string[];
  borrowRecords: string[];
  poolRecords: string[];
}

export interface IWallet extends Document {
  walletAddress: string;
  chain: string;
  userId: string;
}

export interface IPoolRecord extends Document {
  amount: number;
  chain: string;
  depositTxHash: string;
  depositedBy: string;
  amountLocked: number;
  withdrawn: number;
  endDate: Date;
}

export interface IPoolRecord extends Document {
  amount: number;
  chain: string;
  depositTxHash: string;
  depositedBy: string;
  amountLocked: number;
  withdrawn: number;
  endDate: Date;
}

export interface IRepayRecord extends Document {
  amount: number;
  chain: string;
  associatedBorrow: string;
}

export interface IBorrowRecord extends Document {
  amount: number;
  chain: string;
  borrowTxHash: string;
  associatedCollaterals: string[];
  associatedPools: string[];
  associatedRepays: string[];
  borrowedBy: string;
}
