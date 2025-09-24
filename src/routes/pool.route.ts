import { Hono } from "hono";
import {
  getTotalPoolAmount,
  getLockedPoolAmount,
  getAvailablePoolAmount,
  getPoolUtilizationRate,
  getPoolStats,
} from "../utils/poolManager";
import { getCurrentPrices } from "../utils/priceOracle";

const poolRoutes = new Hono();

poolRoutes.get("/status", async (c) => {
  try {
    const poolStats = getPoolStats();
    const prices = await getCurrentPrices();

    // Calculate USD values
    const ethTotalUSD = poolStats.eth.total * prices.eth;
    const ethLockedUSD = poolStats.eth.locked * prices.eth;
    const ethAvailableUSD = poolStats.eth.available * prices.eth;

    const nearTotalUSD = poolStats.near.total * prices.near;
    const nearLockedUSD = poolStats.near.locked * prices.near;
    const nearAvailableUSD = poolStats.near.available * prices.near;

    const grandTotalUSD = ethTotalUSD + nearTotalUSD;
    const grandLockedUSD = ethLockedUSD + nearLockedUSD;
    const grandAvailableUSD = ethAvailableUSD + nearAvailableUSD;

    return c.json({
      success: true,
      data: {
        timestamp: new Date().toISOString(),
        prices: {
          eth: prices.eth,
          near: prices.near,
          lastUpdated: prices.lastUpdated,
        },
        pools: {
          eth: {
            total: poolStats.eth.total,
            locked: poolStats.eth.locked,
            available: poolStats.eth.available,
            utilizationRate: poolStats.eth.utilizationRate,
            totalUSD: ethTotalUSD,
            lockedUSD: ethLockedUSD,
            availableUSD: ethAvailableUSD,
          },
          near: {
            total: poolStats.near.total,
            locked: poolStats.near.locked,
            available: poolStats.near.available,
            utilizationRate: poolStats.near.utilizationRate,
            totalUSD: nearTotalUSD,
            lockedUSD: nearLockedUSD,
            availableUSD: nearAvailableUSD,
          },
        },
        summary: {
          totalUSD: grandTotalUSD,
          lockedUSD: grandLockedUSD,
          availableUSD: grandAvailableUSD,
          overallUtilizationRate: grandTotalUSD > 0 ? (grandLockedUSD / grandTotalUSD) * 100 : 0,
        },
      },
    });
  } catch (error) {
    console.error("Error retrieving pool status:", error);
    return c.json(
      {
        success: false,
        message: "Internal server error",
      },
      500
    );
  }
});

poolRoutes.get("/status/:chain", async (c) => {
  try {
    const chain = c.req.param("chain") as "eth" | "near";

    if (chain !== "eth" && chain !== "near") {
      return c.json(
        {
          success: false,
          message: "Chain must be 'eth' or 'near'",
        },
        400
      );
    }

    const total = getTotalPoolAmount(chain);
    const locked = getLockedPoolAmount(chain);
    const available = getAvailablePoolAmount(chain);
    const utilizationRate = getPoolUtilizationRate(chain);

    const prices = await getCurrentPrices();
    const price = chain === "eth" ? prices.eth : prices.near;

    return c.json({
      success: true,
      data: {
        chain,
        total,
        locked,
        available,
        utilizationRate,
        price,
        totalUSD: total * price,
        lockedUSD: locked * price,
        availableUSD: available * price,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error retrieving pool status for chain:", error);
    return c.json(
      {
        success: false,
        message: "Internal server error",
      },
      500
    );
  }
});

poolRoutes.get("/liquidity/:chain", async (c) => {
  try {
    const chain = c.req.param("chain") as "eth" | "near";

    if (chain !== "eth" && chain !== "near") {
      return c.json(
        {
          success: false,
          message: "Chain must be 'eth' or 'near'",
        },
        400
      );
    }

    const available = getAvailablePoolAmount(chain);
    const total = getTotalPoolAmount(chain);
    const locked = getLockedPoolAmount(chain);
    const utilizationRate = getPoolUtilizationRate(chain);

    const canBorrow = available > 0;
    const maxBorrowable = available;

    return c.json({
      success: true,
      data: {
        chain,
        availableLiquidity: available,
        totalLiquidity: total,
        lockedLiquidity: locked,
        utilizationRate,
        canBorrow,
        maxBorrowable,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error retrieving liquidity status:", error);
    return c.json(
      {
        success: false,
        message: "Internal server error",
      },
      500
    );
  }
});

export default poolRoutes;