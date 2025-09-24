import { Hono } from "hono";
import { ACCOUNT_STATE, LOAN_RECORDS, USER_LOANS, COLLATERAL_RECORDS } from "../state/state-class";
import { initializeAccount } from "../state/state-methods";
import { collateralExists, getCollateralValue } from "../utils/collateral";
import { createLoan, calculateLoanSummary } from "../utils/loanManager";
import { getCurrentPrices, calculateBorrowableTokens } from "../utils/priceOracle";
import { lockLendFundsForLoan, unlockLendFundsForLoan, getAvailablePoolAmount } from "../utils/poolManager";
import { canUserAccessCollateral, getAllUserAddresses } from "../utils/addressResolver";

const borrowRoutes = new Hono();

borrowRoutes.post("/request", async (c) => {
  try {
    const requestBody = await c.req.json();
    const { borrower, collateralTxHash, borrowChain, borrowAmount } = requestBody;

    if (!borrower || !collateralTxHash || !borrowChain || !borrowAmount) {
      return c.json(
        {
          success: false,
          message: "borrower, collateralTxHash, borrowChain, and borrowAmount are required",
        },
        400
      );
    }

    if (borrowChain !== "eth" && borrowChain !== "near") {
      return c.json(
        {
          success: false,
          message: "borrowChain must be 'eth' or 'near'",
        },
        400
      );
    }

    if (borrowAmount <= 0) {
      return c.json(
        {
          success: false,
          message: "borrowAmount must be greater than 0",
        },
        400
      );
    }

    if (!collateralExists(collateralTxHash)) {
      return c.json(
        {
          success: false,
          message: "Collateral not found or invalid",
        },
        404
      );
    }

    const collateralInfo = await getCollateralValue(collateralTxHash);
    if (!collateralInfo) {
      return c.json(
        {
          success: false,
          message: "Unable to retrieve collateral information",
        },
        500
      );
    }

    // Find the actual owner of the collateral
    const collateralOwner = Object.keys(ACCOUNT_STATE).find(address =>
      ACCOUNT_STATE[address].collaterals.includes(collateralTxHash)
    );

    if (!collateralOwner) {
      return c.json(
        {
          success: false,
          message: "Collateral owner not found",
        },
        404
      );
    }

    // Check if borrower can access this collateral (direct ownership or linked addresses)
    if (!canUserAccessCollateral(borrower, collateralOwner)) {
      return c.json(
        {
          success: false,
          message: "You can only borrow against your own collateral or collateral from linked addresses",
        },
        403
      );
    }

    const prices = await getCurrentPrices();
    const borrowValueUSD = borrowAmount * (borrowChain === "eth" ? prices.eth : prices.near);

    if (borrowValueUSD > collateralInfo.maxBorrowableUSD) {
      const maxBorrowableTokens = calculateBorrowableTokens(
        collateralInfo.maxBorrowableUSD,
        borrowChain,
        prices
      );

      return c.json(
        {
          success: false,
          message: `Borrow amount exceeds collateral limit. Maximum borrowable: ${maxBorrowableTokens.toFixed(6)} ${borrowChain.toUpperCase()}`,
          maxBorrowable: {
            amountUSD: collateralInfo.maxBorrowableUSD,
            amountTokens: maxBorrowableTokens,
            chain: borrowChain,
          },
        },
        400
      );
    }

    // Check if there's sufficient liquidity in the pool
    const availablePoolAmount = getAvailablePoolAmount(borrowChain);
    if (borrowAmount > availablePoolAmount) {
      return c.json(
        {
          success: false,
          message: `Insufficient liquidity in ${borrowChain.toUpperCase()} pool. Available: ${availablePoolAmount.toFixed(6)} ${borrowChain.toUpperCase()}, Requested: ${borrowAmount} ${borrowChain.toUpperCase()}`,
          availableLiquidity: availablePoolAmount,
        },
        400
      );
    }

    const loan = await createLoan(borrower, collateralTxHash, borrowChain, borrowAmount);

    // Lock lend funds for this loan
    try {
      const lockIds = lockLendFundsForLoan(loan.id, borrowAmount, borrowChain);
      console.log(`Locked ${lockIds.length} lend records for loan ${loan.id}`);
    } catch (error) {
      return c.json(
        {
          success: false,
          message: error instanceof Error ? error.message : "Failed to lock lend funds",
        },
        400
      );
    }

    LOAN_RECORDS[loan.id] = loan;

    if (!USER_LOANS[borrower]) {
      USER_LOANS[borrower] = [];
    }
    USER_LOANS[borrower].push(loan.id);

    if (!ACCOUNT_STATE[borrower]) {
      initializeAccount(borrower);
    }

    ACCOUNT_STATE[borrower].borrowedAmounts[borrowChain as "eth" | "near"] += borrowAmount;
    ACCOUNT_STATE[borrower].borrow.push(loan.id);

    // Lock collateral in the actual owner's account
    ACCOUNT_STATE[collateralOwner].locked.collateral.ids.push(collateralTxHash);

    return c.json({
      success: true,
      message: "Loan created successfully",
      data: {
        loanId: loan.id,
        borrower: loan.borrower,
        borrowAmount: loan.borrowAmount,
        borrowChain: loan.borrowChain,
        interestAmount: loan.interestAmount,
        totalRepaymentAmount: loan.totalRepaymentAmount,
        dueDate: loan.dueDate,
        collateralInfo: {
          txHash: loan.collateralTxHash,
          chain: loan.collateralChain,
          amount: loan.collateralAmount,
          valueUSD: loan.collateralValueUSD,
        },
        loanTermMonths: loan.loanTermMonths,
        interestRate: loan.interestRate,
      },
    });
  } catch (error) {
    console.error("Error processing borrow request:", error);
    return c.json(
      {
        success: false,
        message: "Internal server error",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

borrowRoutes.get("/status/:loanId", async (c) => {
  try {
    const loanId = c.req.param("loanId");

    if (!loanId) {
      return c.json(
        {
          success: false,
          message: "loanId is required",
        },
        400
      );
    }

    const loan = LOAN_RECORDS[loanId];
    if (!loan) {
      return c.json(
        {
          success: false,
          message: "Loan not found",
        },
        404
      );
    }

    const loanSummary = calculateLoanSummary(loan);

    return c.json({
      success: true,
      data: loanSummary,
    });
  } catch (error) {
    console.error("Error retrieving loan status:", error);
    return c.json(
      {
        success: false,
        message: "Internal server error",
      },
      500
    );
  }
});

borrowRoutes.post("/repay", async (c) => {
  try {
    const requestBody = await c.req.json();
    const { loanId, repaymentTxHash, repaymentChain } = requestBody;

    if (!loanId || !repaymentTxHash || !repaymentChain) {
      return c.json(
        {
          success: false,
          message: "loanId, repaymentTxHash, and repaymentChain are required",
        },
        400
      );
    }

    if (repaymentChain !== "eth" && repaymentChain !== "near") {
      return c.json(
        {
          success: false,
          message: "repaymentChain must be 'eth' or 'near'",
        },
        400
      );
    }

    const loan = LOAN_RECORDS[loanId];
    if (!loan) {
      return c.json(
        {
          success: false,
          message: "Loan not found",
        },
        404
      );
    }

    if (loan.status !== "active") {
      return c.json(
        {
          success: false,
          message: "Loan is not active",
        },
        400
      );
    }

    if (repaymentChain !== loan.borrowChain) {
      return c.json(
        {
          success: false,
          message: `Repayment must be in ${loan.borrowChain.toUpperCase()}`,
        },
        400
      );
    }

    loan.status = "repaid";

    // Unlock lend funds for this loan
    unlockLendFundsForLoan(loanId);
    console.log(`Unlocked lend funds for loan ${loanId}`);

    if (!ACCOUNT_STATE[loan.borrower]) {
      initializeAccount(loan.borrower);
    }

    ACCOUNT_STATE[loan.borrower].borrowedAmounts[loan.borrowChain as "eth" | "near"] = Math.max(
      0,
      ACCOUNT_STATE[loan.borrower].borrowedAmounts[loan.borrowChain as "eth" | "near"] - loan.borrowAmount
    );

    // Find the actual collateral owner and unlock from their account
    const collateralOwner = Object.keys(ACCOUNT_STATE).find(address =>
      ACCOUNT_STATE[address].locked.collateral.ids.includes(loan.collateralTxHash)
    );

    if (collateralOwner) {
      const lockedCollateralIndex = ACCOUNT_STATE[collateralOwner].locked.collateral.ids.indexOf(
        loan.collateralTxHash
      );
      if (lockedCollateralIndex > -1) {
        ACCOUNT_STATE[collateralOwner].locked.collateral.ids.splice(lockedCollateralIndex, 1);
      }
    }

    const loanSummary = calculateLoanSummary(loan);

    return c.json({
      success: true,
      message: "Loan repaid successfully",
      data: {
        loanId: loan.id,
        borrower: loan.borrower,
        repaidAmount: loan.totalRepaymentAmount,
        repaymentTxHash,
        repaymentChain,
        collateralUnlocked: {
          txHash: loan.collateralTxHash,
          chain: loan.collateralChain,
          amount: loan.collateralAmount,
        },
        loanSummary,
      },
    });
  } catch (error) {
    console.error("Error processing loan repayment:", error);
    return c.json(
      {
        success: false,
        message: "Internal server error",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

borrowRoutes.get("/user/:address", async (c) => {
  try {
    const address = c.req.param("address");

    if (!address) {
      return c.json(
        {
          success: false,
          message: "address is required",
        },
        400
      );
    }

    // Get loans from all linked addresses
    const userAddresses = getAllUserAddresses(address);
    const allUserLoanIds: string[] = [];

    for (const userAddr of userAddresses) {
      const loanIds = USER_LOANS[userAddr] || [];
      allUserLoanIds.push(...loanIds);
    }

    // Remove duplicates
    const uniqueLoanIds = [...new Set(allUserLoanIds)];

    const userLoans = uniqueLoanIds.map(loanId => {
      const loan = LOAN_RECORDS[loanId];
      return loan ? calculateLoanSummary(loan) : null;
    }).filter(loan => loan !== null);

    return c.json({
      success: true,
      data: {
        address,
        linkedAddresses: userAddresses,
        totalLoans: userLoans.length,
        activeLoans: userLoans.filter(loan => loan.status === "active").length,
        loans: userLoans,
      },
    });
  } catch (error) {
    console.error("Error retrieving user loans:", error);
    return c.json(
      {
        success: false,
        message: "Internal server error",
      },
      500
    );
  }
});

export default borrowRoutes;
