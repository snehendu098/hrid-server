import { ACCOUNT_STATE, LEND_RECORDS, LEND_LOCKS, LOAN_RECORDS } from "../state/state-class";
import { LendLock } from "../interface/models";

export function generateLockId(): string {
  return `lock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function getTotalPoolAmount(chain: "eth" | "near"): number {
  let total = 0;

  // Sum all lended balances across all users
  for (const address in ACCOUNT_STATE) {
    total += ACCOUNT_STATE[address].lendedBalance[chain];
  }

  return total;
}

export function getLockedPoolAmount(chain: "eth" | "near"): number {
  let locked = 0;

  // Sum all active loan amounts for the specified chain
  for (const loanId in LOAN_RECORDS) {
    const loan = LOAN_RECORDS[loanId];
    if (loan.status === "active" && loan.borrowChain === chain) {
      locked += loan.borrowAmount;
    }
  }

  return locked;
}

export function getAvailablePoolAmount(chain: "eth" | "near"): number {
  return getTotalPoolAmount(chain) - getLockedPoolAmount(chain);
}

export function getPoolUtilizationRate(chain: "eth" | "near"): number {
  const total = getTotalPoolAmount(chain);
  if (total === 0) return 0;

  const locked = getLockedPoolAmount(chain);
  return (locked / total) * 100;
}

export function lockLendFundsForLoan(
  loanId: string,
  borrowAmount: number,
  borrowChain: "eth" | "near"
): string[] {
  const lockIds: string[] = [];
  let remainingAmount = borrowAmount;

  // Find available lend records to lock
  const availableLends = getAvailableLendsByChain(borrowChain);

  for (const lendRecord of availableLends) {
    if (remainingAmount <= 0) break;

    const availableAmount = getAvailableLendAmount(lendRecord.txnHash);
    const lockAmount = Math.min(availableAmount, remainingAmount);

    if (lockAmount > 0) {
      const lockId = generateLockId();
      const lock: LendLock = {
        lendTxHash: lendRecord.txnHash,
        loanId,
        amount: lockAmount,
        chain: borrowChain,
        lender: lendRecord.lender,
      };

      LEND_LOCKS[lockId] = lock;

      // Add lock ID to user's locked lends
      if (!ACCOUNT_STATE[lendRecord.lender].locked.lends.ids.includes(lendRecord.txnHash)) {
        ACCOUNT_STATE[lendRecord.lender].locked.lends.ids.push(lendRecord.txnHash);
      }

      lockIds.push(lockId);
      remainingAmount -= lockAmount;
    }
  }

  if (remainingAmount > 0) {
    throw new Error(`Insufficient liquidity. Need ${borrowAmount} ${borrowChain.toUpperCase()}, only ${borrowAmount - remainingAmount} available`);
  }

  return lockIds;
}

export function unlockLendFundsForLoan(loanId: string): void {
  // Find all locks for this loan
  const locksToRemove = Object.keys(LEND_LOCKS).filter(
    lockId => LEND_LOCKS[lockId].loanId === loanId
  );

  for (const lockId of locksToRemove) {
    const lock = LEND_LOCKS[lockId];

    // Check if this lend record has any other active locks
    const hasOtherLocks = Object.values(LEND_LOCKS).some(
      otherLock => otherLock.lendTxHash === lock.lendTxHash && otherLock.loanId !== loanId
    );

    // If no other locks, remove from user's locked lends
    if (!hasOtherLocks) {
      const lockedIndex = ACCOUNT_STATE[lock.lender].locked.lends.ids.indexOf(lock.lendTxHash);
      if (lockedIndex > -1) {
        ACCOUNT_STATE[lock.lender].locked.lends.ids.splice(lockedIndex, 1);
      }
    }

    // Remove the lock
    delete LEND_LOCKS[lockId];
  }
}

function getAvailableLendsByChain(chain: "eth" | "near") {
  return Object.values(LEND_RECORDS).filter(lend => lend.chain === chain);
}

function getAvailableLendAmount(lendTxHash: string): number {
  const lendRecord = LEND_RECORDS[lendTxHash];
  if (!lendRecord) return 0;

  // Calculate how much of this lend is already locked
  let lockedAmount = 0;
  for (const lock of Object.values(LEND_LOCKS)) {
    if (lock.lendTxHash === lendTxHash) {
      lockedAmount += lock.amount;
    }
  }

  return lendRecord.amount - lockedAmount;
}

export function getUserAvailableLendBalance(address: string, chain: "eth" | "near"): number {
  const account = ACCOUNT_STATE[address];
  if (!account) return 0;

  const totalBalance = account.lendedBalance[chain];
  let lockedAmount = 0;

  // Calculate locked amount for this user and chain
  for (const lock of Object.values(LEND_LOCKS)) {
    if (lock.lender === address && lock.chain === chain) {
      lockedAmount += lock.amount;
    }
  }

  return totalBalance - lockedAmount;
}

export function getUserLockedLendBalance(address: string, chain: "eth" | "near"): number {
  let lockedAmount = 0;

  // Calculate locked amount for this user and chain
  for (const lock of Object.values(LEND_LOCKS)) {
    if (lock.lender === address && lock.chain === chain) {
      lockedAmount += lock.amount;
    }
  }

  return lockedAmount;
}

export function getPoolStats() {
  return {
    eth: {
      total: getTotalPoolAmount("eth"),
      locked: getLockedPoolAmount("eth"),
      available: getAvailablePoolAmount("eth"),
      utilizationRate: getPoolUtilizationRate("eth"),
    },
    near: {
      total: getTotalPoolAmount("near"),
      locked: getLockedPoolAmount("near"),
      available: getAvailablePoolAmount("near"),
      utilizationRate: getPoolUtilizationRate("near"),
    },
  };
}