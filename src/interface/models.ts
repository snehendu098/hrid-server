export interface chainBalance {
  near: number;
  eth: number;
}

export interface AccountData {
  borrowBalance: chainBalance;
  collateralRemaining: chainBalance;
  lendedBalance: chainBalance;
  borrowedAmounts: chainBalance;
  collaterals: string[];
  lends: string[];
  borrow: string[];
  locked: {
    lends: {
      ids: string[];
    };
    collateral: {
      ids: string[];
    };
  };
}

export interface Collateral {
  amount: number;
  txnHash: string;
  chain: "eth" | "near";
}

export interface LendRecord {
  amount: number;
  chain: "eth" | "near";
  txnHash: string;
}

export interface BorrowRecord {
  amount: number;
  chain: "eth" | "near";
  txnHash: string;
}
