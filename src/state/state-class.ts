import {
  AccountData,
  LendRecord,
  Collateral,
  LoanRecord,
  LendLock,
  UserProfile,
} from "../interface/models";

export const BORROW_APY = 7;
export const LEND_APY = 5;

export const ACCOUNT_STATE: { [address: string]: AccountData } = {};
export const LEND_RECORDS: { [txHash: string]: LendRecord } = {};
export const COLLATERAL_RECORDS: { [txHash: string]: Collateral } = {};
export const LOAN_RECORDS: { [loanId: string]: LoanRecord } = {};
export const USER_LOANS: { [address: string]: string[] } = {};
export const LEND_LOCKS: { [lockId: string]: LendLock } = {};
export const USER_PROFILES: { [userId: string]: UserProfile } = {};
export const ADDRESS_TO_USER: { [address: string]: string } = {};
