import { AccountData, LendRecord, Collateral, LoanRecord } from "../interface/models";

export const BORROW_APY = 7;
export const LEND_APY = 5;

export const ACCOUNT_STATE: { [addresss: string]: AccountData } = {};
export const LEND_RECORDS: { [address: string]: LendRecord } = {};
export const COLLATERAL_RECORDS: { [txHash: string]: Collateral } = {};
export const LOAN_RECORDS: { [loanId: string]: LoanRecord } = {};
export const USER_LOANS: { [address: string]: string[] } = {};
