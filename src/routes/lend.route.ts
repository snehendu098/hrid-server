import { Hono } from "hono";
import { INearApiResponse } from "../interface/near.explorer";
import { ACCOUNT_STATE } from "../state/state-class";
import { initializeAccount } from "../state/state-methods";
import { NEAR } from "@near-js/tokens";
import { SepoliaTransactionResponse } from "../interface/sepolia.explorer";
import { formatEther } from "viem";
import { verifyDeposit } from "../utils/account";

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

export default lendRoutes;
