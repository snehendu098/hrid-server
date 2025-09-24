import { LoanRecord } from "../interface/models";
import {
  getCurrentPrices,
  calculateLoanInterest,
  calculateTotalRepayment,
  calculateDueDate,
  calculateBorrowableTokens
} from "./priceOracle";
import { getCollateralValue } from "./collateral";

export function generateLoanId(): string {
  return `loan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export async function createLoan(
  borrower: string,
  collateralTxHash: string,
  borrowChain: "eth" | "near",
  borrowAmount: number
): Promise<LoanRecord> {
  const collateralInfo = await getCollateralValue(collateralTxHash);
  if (!collateralInfo) {
    throw new Error("Invalid collateral");
  }

  const prices = await getCurrentPrices();
  const borrowValueUSD = borrowAmount * (borrowChain === "eth" ? prices.eth : prices.near);

  if (borrowValueUSD > collateralInfo.maxBorrowableUSD) {
    throw new Error("Borrow amount exceeds collateral limit");
  }

  const interestAmount = calculateLoanInterest(borrowAmount);
  const totalRepaymentAmount = calculateTotalRepayment(borrowAmount);
  const startTime = new Date();
  const dueDate = calculateDueDate(startTime);

  const loan: LoanRecord = {
    id: generateLoanId(),
    borrower,
    collateralTxHash,
    collateralChain: collateralInfo.chain,
    collateralAmount: collateralInfo.amount,
    collateralValueUSD: collateralInfo.valueUSD,
    borrowChain,
    borrowAmount,
    borrowValueUSD,
    interestRate: 7,
    loanTermMonths: 3,
    interestAmount,
    totalRepaymentAmount,
    startTime,
    dueDate,
    status: "active",
    collateralRatio: 80,
  };

  return loan;
}

export function validateBorrowRequest(
  borrowAmount: number,
  borrowChain: "eth" | "near",
  collateralInfo: { maxBorrowableUSD: number }
): { valid: boolean; error?: string; maxBorrowableTokens?: number } {
  if (borrowAmount <= 0) {
    return { valid: false, error: "Borrow amount must be greater than 0" };
  }

  return { valid: true };
}

export function calculateLoanSummary(loan: LoanRecord) {
  const now = new Date();
  const isOverdue = now > loan.dueDate && loan.status === "active";
  const daysUntilDue = Math.ceil((loan.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  return {
    loanId: loan.id,
    borrower: loan.borrower,
    borrowAmount: loan.borrowAmount,
    borrowChain: loan.borrowChain,
    interestAmount: loan.interestAmount,
    totalRepaymentAmount: loan.totalRepaymentAmount,
    status: loan.status,
    dueDate: loan.dueDate,
    isOverdue,
    daysUntilDue: isOverdue ? 0 : Math.max(0, daysUntilDue),
    collateralInfo: {
      txHash: loan.collateralTxHash,
      chain: loan.collateralChain,
      amount: loan.collateralAmount,
      valueUSD: loan.collateralValueUSD,
    },
  };
}