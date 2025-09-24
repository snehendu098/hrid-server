import { contracts, chainAdapters } from "chainsig.js";
import { createPublicClient, http } from "viem";

export const ethRpcUrl = "https://base-sepolia.drpc.org";

const MPC_CONTRACT = new contracts.ChainSignatureContract({
  networkId: `testnet`,
  contractId: `v1.signer-prod.testnet`,
});

const publicClient = createPublicClient({
  transport: http(ethRpcUrl),
});

export const Evm = new chainAdapters.evm.EVM({
  publicClient,
  contract: MPC_CONTRACT,
}) as any;
