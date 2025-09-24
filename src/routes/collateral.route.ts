import { Hono } from "hono";
import { INearApiResponse } from "../interface/near.explorer";
import { ACCOUNT_STATE, COLLATERAL_RECORDS } from "../state/state-class";
import { initializeAccount } from "../state/state-methods";
import { NEAR } from "@near-js/tokens";
import { SepoliaTransactionResponse } from "../interface/sepolia.explorer";
import { formatEther } from "viem";
import { verifyDeposit } from "../utils/account";
import { canUserAccessCollateral, getAllUserAddresses } from "../utils/addressResolver";

const collateralRoutes = new Hono();

collateralRoutes.post("/deposit", async (c) => {
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

      ACCOUNT_STATE[account].collateralRemaining.near += depositAmount;
      ACCOUNT_STATE[account].collaterals.push(txHash);
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

      ACCOUNT_STATE[account].collateralRemaining.eth += depositAmount;
      ACCOUNT_STATE[account].collaterals.push(txHash);
    }

    // Store collateral record
    COLLATERAL_RECORDS[txHash] = {
      amount: depositAmount,
      txnHash: txHash,
      chain: chain as "eth" | "near",
    };

    return c.json({
      success: true,
      message: "Collateral deposit processed successfully",
      data: {
        account,
        chain,
        amount: depositAmount,
        txHash,
      },
    });
  } catch (error) {
    console.error("Error processing collateral deposit:", error);
    return c.json(
      {
        success: false,
        message: "Internal server error",
      },
      500
    );
  }
});

collateralRoutes.post("/withdraw", async (c) => {
  try {
    const requestBody = await c.req.json();
    const { address, collateralTxHash } = requestBody;

    if (!address || !collateralTxHash) {
      return c.json(
        {
          success: false,
          message: "address and collateralTxHash are required",
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

    const collateral = COLLATERAL_RECORDS[collateralTxHash];
    if (!collateral) {
      return c.json(
        {
          success: false,
          message: "Collateral not found",
        },
        404
      );
    }

    // Check if user can access this collateral (direct ownership or linked addresses)
    const collateralOwner = Object.keys(ACCOUNT_STATE).find(addr =>
      ACCOUNT_STATE[addr].collaterals.includes(collateralTxHash)
    );

    if (!collateralOwner || !canUserAccessCollateral(address, collateralOwner)) {
      return c.json(
        {
          success: false,
          message: "You can only withdraw your own collateral or collateral from linked addresses",
        },
        403
      );
    }

    if (ACCOUNT_STATE[address].locked.collateral.ids.includes(collateralTxHash)) {
      return c.json(
        {
          success: false,
          message: "Collateral is locked in an active loan. Repay the loan first.",
        },
        400
      );
    }

    // Remove from actual collateral owner's account
    const ownerCollateralIndex = ACCOUNT_STATE[collateralOwner].collaterals.indexOf(collateralTxHash);
    if (ownerCollateralIndex > -1) {
      ACCOUNT_STATE[collateralOwner].collaterals.splice(ownerCollateralIndex, 1);
    }

    ACCOUNT_STATE[collateralOwner].collateralRemaining[collateral.chain] = Math.max(
      0,
      ACCOUNT_STATE[collateralOwner].collateralRemaining[collateral.chain] - collateral.amount
    );

    delete COLLATERAL_RECORDS[collateralTxHash];

    return c.json({
      success: true,
      message: "Collateral withdrawn successfully",
      data: {
        address,
        withdrawnCollateral: {
          txHash: collateralTxHash,
          chain: collateral.chain,
          amount: collateral.amount,
        },
      },
    });
  } catch (error) {
    console.error("Error processing collateral withdrawal:", error);
    return c.json(
      {
        success: false,
        message: "Internal server error",
      },
      500
    );
  }
});

collateralRoutes.get("/status/:address", async (c) => {
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

    // Get all addresses for this user (including linked addresses)
    const userAddresses = getAllUserAddresses(address);

    // Collect collaterals from all user's addresses
    const allUserCollaterals: any[] = [];
    let totalCollateralBalances = { eth: 0, near: 0 };

    for (const userAddr of userAddresses) {
      if (ACCOUNT_STATE[userAddr]) {
        const accountCollaterals = ACCOUNT_STATE[userAddr].collaterals.map((txHash) => {
          const collateral = COLLATERAL_RECORDS[txHash];
          const isLocked = ACCOUNT_STATE[userAddr].locked.collateral.ids.includes(txHash);

          return {
            txHash,
            chain: collateral?.chain || "unknown",
            amount: collateral?.amount || 0,
            isLocked,
            status: isLocked ? "locked" : "available",
            ownerAddress: userAddr,
          };
        });

        allUserCollaterals.push(...accountCollaterals);

        // Add to total balances
        totalCollateralBalances.eth += ACCOUNT_STATE[userAddr].collateralRemaining.eth;
        totalCollateralBalances.near += ACCOUNT_STATE[userAddr].collateralRemaining.near;
      }
    }

    if (allUserCollaterals.length === 0) {
      return c.json({
        success: true,
        data: {
          address,
          linkedAddresses: userAddresses,
          totalCollaterals: 0,
          availableCollaterals: 0,
          lockedCollaterals: 0,
          collaterals: [],
          collateralBalances: { eth: 0, near: 0 },
        },
      });
    }

    const userCollaterals = allUserCollaterals;

    const availableCollaterals = userCollaterals.filter(c => !c.isLocked);
    const lockedCollaterals = userCollaterals.filter(c => c.isLocked);

    return c.json({
      success: true,
      data: {
        address,
        linkedAddresses: userAddresses,
        totalCollaterals: userCollaterals.length,
        availableCollaterals: availableCollaterals.length,
        lockedCollaterals: lockedCollaterals.length,
        collaterals: userCollaterals,
        collateralBalances: totalCollateralBalances,
      },
    });
  } catch (error) {
    console.error("Error retrieving collateral status:", error);
    return c.json(
      {
        success: false,
        message: "Internal server error",
      },
      500
    );
  }
});

export default collateralRoutes;
