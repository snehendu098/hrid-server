import { Hono } from "hono";
import { INearApiResponse } from "../interface/near.explorer";
import { ACCOUNT_STATE, LEND_RECORDS } from "../state/state-class";
import { initializeAccount } from "../state/state-methods";
import { NEAR } from "@near-js/tokens";
import { SepoliaTransactionResponse } from "../interface/sepolia.explorer";
import { formatEther } from "viem";
import { verifyDeposit } from "../utils/account";
import { getUserAvailableLendBalance, getUserLockedLendBalance } from "../utils/poolManager";

const lendRoutes = new Hono();

lendRoutes.post("/deposit", async (c) => {
  try {
    const requestBody = await c.req.json();
    const { txHash, chain } = requestBody;

    if (!txHash || !chain) {
      return c.json(
        {
          success: false,
          message: "txHash and chain are required",
        },
        400
      );
    }

    if (chain !== "eth" && chain !== "near") {
      return c.json(
        {
          success: false,
          message: "Chain must be 'eth' or 'near'",
        },
        400
      );
    }

    const { data, success, message } = await verifyDeposit(chain, txHash);

    if (!success) {
      return c.json({ success: false, message }, 400);
    }

    if (!data) {
      return c.json(
        { success: false, message: "No transaction data received" },
        500
      );
    }

    let account: string;
    let depositAmount: number;

    if (chain === "near") {
      const nearData = data as INearApiResponse;

      if (!nearData.receipts || nearData.receipts.length === 0) {
        return c.json(
          { success: false, message: "No receipts found in transaction" },
          400
        );
      }

      const main = nearData.receipts[0].receipt_tree;
      if (!main || !main.predecessor_account_id) {
        return c.json(
          { success: false, message: "Invalid transaction structure" },
          400
        );
      }

      if (
        !main.actions ||
        main.actions.length === 0 ||
        !main.actions[0].args?.deposit
      ) {
        return c.json(
          { success: false, message: "No deposit amount found in transaction" },
          400
        );
      }

      account = main.predecessor_account_id;
      depositAmount = Number(NEAR.toDecimal(main.actions[0].args.deposit));

      if (!ACCOUNT_STATE[account]) {
        initializeAccount(account);
      }

      ACCOUNT_STATE[account].lendedBalance.near += depositAmount;

      // Store lend record
      LEND_RECORDS[txHash] = {
        amount: depositAmount,
        chain: "near",
        txnHash: txHash,
        lender: account,
        timestamp: new Date(),
      };
    } else {
      const ethData = data as SepoliaTransactionResponse;

      if (!ethData.from?.hash || !ethData.value) {
        return c.json(
          { success: false, message: "Invalid ETH transaction structure" },
          400
        );
      }

      account = ethData.from.hash;
      depositAmount = parseFloat(formatEther(BigInt(ethData.value)));

      if (!ACCOUNT_STATE[account]) {
        initializeAccount(account);
      }

      ACCOUNT_STATE[account].lendedBalance.eth += depositAmount;

      // Store lend record
      LEND_RECORDS[txHash] = {
        amount: depositAmount,
        chain: "eth",
        txnHash: txHash,
        lender: account,
        timestamp: new Date(),
      };
    }

    return c.json({
      success: true,
      message: "Deposit processed successfully",
      data: {
        account,
        chain,
        amount: depositAmount,
        txHash,
      },
    });
  } catch (error) {
    console.error("Error processing deposit:", error);
    return c.json(
      {
        success: false,
        message: "Internal server error",
      },
      500
    );
  }
});

lendRoutes.post("/withdraw", async (c) => {
  try {
    const requestBody = await c.req.json();
    const { address, withdrawChain, withdrawAmount } = requestBody;

    if (!address || !withdrawChain || !withdrawAmount) {
      return c.json(
        {
          success: false,
          message: "address, withdrawChain, and withdrawAmount are required",
        },
        400
      );
    }

    if (withdrawChain !== "eth" && withdrawChain !== "near") {
      return c.json(
        {
          success: false,
          message: "withdrawChain must be 'eth' or 'near'",
        },
        400
      );
    }

    if (withdrawAmount <= 0) {
      return c.json(
        {
          success: false,
          message: "withdrawAmount must be greater than 0",
        },
        400
      );
    }

    if (!ACCOUNT_STATE[address]) {
      return c.json(
        {
          success: false,
          message: "Account not found",
        },
        404
      );
    }

    const totalBalance = ACCOUNT_STATE[address].lendedBalance[withdrawChain as "eth" | "near"];
    const availableBalance = getUserAvailableLendBalance(address, withdrawChain as "eth" | "near");
    const lockedBalance = getUserLockedLendBalance(address, withdrawChain as "eth" | "near");

    if (availableBalance < withdrawAmount) {
      return c.json(
        {
          success: false,
          message: `Insufficient available balance. Total: ${totalBalance} ${withdrawChain.toUpperCase()}, Available: ${availableBalance} ${withdrawChain.toUpperCase()}, Locked: ${lockedBalance} ${withdrawChain.toUpperCase()}`,
        },
        400
      );
    }

    ACCOUNT_STATE[address].lendedBalance[withdrawChain as "eth" | "near"] -= withdrawAmount;

    return c.json({
      success: true,
      message: "Lend withdrawal processed successfully",
      data: {
        address,
        withdrawnAmount: withdrawAmount,
        withdrawChain,
        remainingBalance: ACCOUNT_STATE[address].lendedBalance[withdrawChain as "eth" | "near"],
      },
    });
  } catch (error) {
    console.error("Error processing lend withdrawal:", error);
    return c.json(
      {
        success: false,
        message: "Internal server error",
      },
      500
    );
  }
});

lendRoutes.get("/earnings/:address", async (c) => {
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

    if (!ACCOUNT_STATE[address]) {
      return c.json({
        success: true,
        data: {
          address,
          lendedBalance: { eth: 0, near: 0 },
          projectedEarnings: { eth: 0, near: 0 },
          totalValueUSD: 0,
        },
      });
    }

    const totalBalance = ACCOUNT_STATE[address].lendedBalance;
    const availableBalance = {
      eth: getUserAvailableLendBalance(address, "eth"),
      near: getUserAvailableLendBalance(address, "near"),
    };
    const lockedBalance = {
      eth: getUserLockedLendBalance(address, "eth"),
      near: getUserLockedLendBalance(address, "near"),
    };

    // Calculate 3-month earnings at 5% APY on total balance
    const projectedEarnings = {
      eth: totalBalance.eth * 0.05 * (3 / 12), // 5% APY for 3 months
      near: totalBalance.near * 0.05 * (3 / 12),
    };

    // Calculate total USD value (this would need current prices in a real implementation)
    const totalValueUSD = 0; // Placeholder - would need price calculation

    return c.json({
      success: true,
      data: {
        address,
        totalBalance,
        availableBalance,
        lockedBalance,
        projectedEarnings,
        annualPercentageYield: 5,
        loanTermMonths: 3,
        totalValueUSD,
      },
    });
  } catch (error) {
    console.error("Error retrieving lend earnings:", error);
    return c.json(
      {
        success: false,
        message: "Internal server error",
      },
      500
    );
  }
});

export default lendRoutes;
