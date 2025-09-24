import { Hono } from "hono";
import { agent, agentAccountId } from "@neardefi/shade-agent-js/index.cjs";
import { Evm } from "../utils/ethereum";
import { transferAssets } from "../utils/account";
import { fetchPrice } from "../utils/coingecko";

const agentRoutes = new Hono();

agentRoutes.get("/info", async (c) => {
  try {
    const accountId = await agentAccountId();

    // Get the balance of the agent account
    const balance = await agent("getBalance");

    return c.json({
      accountId: accountId.accountId,
      balance: balance.balance,
    });
  } catch (error) {
    console.log("Error getting agent account:", error);
    return c.json({ error: "Failed to get agent account " + error }, 500);
  }
});

agentRoutes.get("/info-eth", async (c) => {
  const contractId = process.env.NEXT_PUBLIC_contractId;

  try {
    const { address: senderAddress } = await Evm.deriveAddressAndPublicKey(
      contractId,
      "ethereum-1"
    );

    // Get the balance of the address
    const balance = await Evm.getBalance(senderAddress);

    const amountData = await fetchPrice();

    return c.json({ senderAddress, balance: Number(balance.balance) });
  } catch (err) {
    return c.json({ error: "Failed to get agent account " + err }, 500);
  }
});

export default agentRoutes;
