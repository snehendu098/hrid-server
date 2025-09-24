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
  lender: string;
  timestamp: Date;
}

export interface LendLock {
  lendTxHash: string;
  loanId: string;
  amount: number;
  chain: "eth" | "near";
  lender: string;
}

export interface BorrowRecord {
  amount: number;
  chain: "eth" | "near";
  txnHash: string;
}

export interface LoanRecord {
  id: string;
  borrower: string;
  collateralTxHash: string;
  collateralChain: "eth" | "near";
  collateralAmount: number;
  collateralValueUSD: number;
  borrowChain: "eth" | "near";
  borrowAmount: number;
  borrowValueUSD: number;
  interestRate: 7;
  loanTermMonths: 3;
  interestAmount: number;
  totalRepaymentAmount: number;
  startTime: Date;
  dueDate: Date;
  status: "active" | "repaid" | "liquidated";
  collateralRatio: 80;
}

export interface PriceData {
  eth: number;
  near: number;
  lastUpdated: Date;
}

export interface UserProfile {
  id: string;
  primaryAddress: string;
  linkedAddresses: {
    eth?: string;
    near?: string;
  };
  verified: boolean;
  createdAt: Date;
  lastUpdated: Date;
}

export interface AddressLinkRequest {
  ethAddress: string;
  nearAddress: string;
  ethSignature: string;
  nearSignature: string;
  timestamp: number;
}

export interface CrossChainProof {
  ethAddress: string;
  nearAddress: string;
  message: string;
  ethSignature: string;
  nearSignature: string;
  isValid: boolean;
}
