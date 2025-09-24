import { AccountData, LendRecord, Collateral } from "../interface/models";

export const BORROW_APY = 7;
export const LEND_APY = 5;

export const ACCOUNT_STATE: { [addresss: string]: AccountData } = {};
export const LEND_RECORDS: { [address: string]: LendRecord } = {};
export const COLLATERAL_RECORDS: { [txHash: string]: Collateral } = {};
