import { ACCOUNT_STATE, COLLATERAL_RECORDS } from "../state/state-class";
import { getCurrentPrices, calculateCollateralValueUSD, calculateMaxBorrowableAmount } from "./priceOracle";

export const verifyCollateralDeposit = async (txHash: string): Promise<boolean> => {
  return COLLATERAL_RECORDS[txHash] !== undefined;
};

export const getCollateralValue = async (
  txHash: string
): Promise<{ valueUSD: number; maxBorrowableUSD: number; chain: "eth" | "near"; amount: number } | null> => {
  const collateral = COLLATERAL_RECORDS[txHash];
  if (!collateral) return null;

  const prices = await getCurrentPrices();
  const valueUSD = calculateCollateralValueUSD(collateral.amount, collateral.chain, prices);
  const maxBorrowableUSD = calculateMaxBorrowableAmount(valueUSD);

  return {
    valueUSD,
    maxBorrowableUSD,
    chain: collateral.chain,
    amount: collateral.amount,
  };
};

export const getUserCollaterals = (address: string) => {
  const account = ACCOUNT_STATE[address];
  if (!account) return [];

  return account.collaterals.map((txHash) => {
    const collateral = COLLATERAL_RECORDS[txHash];
    return {
      txHash,
      ...collateral,
    };
  });
};

export const collateralExists = (txHash: string): boolean => {
  return COLLATERAL_RECORDS[txHash] !== undefined;
};

export const isCollateralAvailable = (txHash: string, requiredAmount?: number): boolean => {
  const collateral = COLLATERAL_RECORDS[txHash];
  if (!collateral) return false;

  if (requiredAmount && collateral.amount < requiredAmount) {
    return false;
  }

  return true;
};
