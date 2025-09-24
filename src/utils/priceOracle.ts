import { fetchPrice } from "./coingecko";
import { PriceData } from "../interface/models";

let priceCache: PriceData | null = null;
const PRICE_CACHE_DURATION = 2 * 60 * 1000; // 5 minutes

export const BORROW_APY = 7;
export const LEND_APY = 5;
export const LOAN_TERM_MONTHS = 3;
export const COLLATERAL_RATIO = 80; // 80% collateral-to-loan ratio

// Testing environment - use 3 minutes instead of 3 months
const IS_TESTING = process.env.ENVIRONMENT === "testing";
export const LOAN_TERM_MINUTES = IS_TESTING ? 3 : LOAN_TERM_MONTHS * 30 * 24 * 60; // 3 minutes or 3 months in minutes

export async function getCurrentPrices(): Promise<PriceData> {
  if (
    priceCache &&
    Date.now() - priceCache.lastUpdated.getTime() < PRICE_CACHE_DURATION
  ) {
    return priceCache;
  }

  try {
    const { ethPrice, nearPrice } = await fetchPrice();

    priceCache = {
      eth: ethPrice.ethereum?.usd || 0,
      near: nearPrice.near?.usd || 0,
      lastUpdated: new Date(),
    };

    return priceCache;
  } catch (error) {
    console.error("Error fetching prices:", error);

    if (priceCache) {
      return priceCache;
    }

    // Fallback prices for development/testing
    const fallbackPrices: PriceData = {
      eth: 2000, // Fallback ETH price
      near: 5,   // Fallback NEAR price
      lastUpdated: new Date(),
    };

    priceCache = fallbackPrices;
    return fallbackPrices;
  }
}

export function calculateCollateralValueUSD(
  amount: number,
  chain: "eth" | "near",
  prices: PriceData
): number {
  const price = chain === "eth" ? prices.eth : prices.near;
  return amount * price;
}

export function calculateMaxBorrowableAmount(
  collateralValueUSD: number
): number {
  return collateralValueUSD * (COLLATERAL_RATIO / 100);
}

export function calculateBorrowableTokens(
  maxBorrowableUSD: number,
  targetChain: "eth" | "near",
  prices: PriceData
): number {
  const targetPrice = targetChain === "eth" ? prices.eth : prices.near;
  return maxBorrowableUSD / targetPrice;
}

export function calculateLoanInterest(loanAmount: number): number {
  return loanAmount * (BORROW_APY / 100) * (LOAN_TERM_MONTHS / 12);
}

export function calculateTotalRepayment(loanAmount: number): number {
  return loanAmount + calculateLoanInterest(loanAmount);
}

export function calculateLendInterest(lendAmount: number): number {
  return lendAmount * (LEND_APY / 100) * (LOAN_TERM_MONTHS / 12);
}

export function calculateDueDate(startDate: Date = new Date()): Date {
  const dueDate = new Date(startDate);
  if (IS_TESTING) {
    dueDate.setMinutes(dueDate.getMinutes() + 3); // Add 3 minutes for testing
  } else {
    dueDate.setMonth(dueDate.getMonth() + LOAN_TERM_MONTHS); // Add 3 months for production
  }
  return dueDate;
}

export function calculateHealthFactor(
  collateralValueUSD: number,
  loanValueUSD: number
): number {
  if (loanValueUSD === 0) return Infinity;
  return (collateralValueUSD * (COLLATERAL_RATIO / 100)) / loanValueUSD;
}
