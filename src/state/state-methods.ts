import { ACCOUNT_STATE } from "./state-class";

export function initializeAccount(account: string): void {
  ACCOUNT_STATE[account] = {
    borrowBalance: {
      eth: 0,
      near: 0,
    },
    collateralRemaining: {
      eth: 0,
      near: 0,
    },
    lendedBalance: {
      eth: 0,
      near: 0,
    },
    borrowedAmounts: {
      eth: 0,
      near: 0,
    },
    collaterals: [],
    lends: [],
    borrow: [],
    locked: {
      lends: {
        ids: [],
      },
      collateral: {
        ids: [],
      },
    },
  };
}
