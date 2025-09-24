import { NEAR } from "@near-js/tokens";
import { getAccount } from "@neardefi/shade-agent-js";
import { INearApiResponse } from "../interface/near.explorer";
import axios from "axios";
import { SepoliaTransactionResponse } from "../interface/sepolia.explorer";
import { Evm } from "./ethereum";
import { requestSignature } from "@neardefi/shade-agent-js";
import { utils } from "chainsig.js";
import { parseEther } from "viem";
const { toRSV, uint8ArrayToHex } = utils.cryptography;

export const agentAccount = async () => {
  const nearAccount = await getAccount();
  const { address: ethAddress } = await Evm.deriveAddressAndPublicKey(
    process.env.NEXT_PUBLIC_contractId,
    "ethereum-1"
  );

  return { nearAccount, ethAccount: ethAddress };
};

// Currently transfer only near assets
export const transferAssets = async (
  amount: number,
  receiverId: string,
  chain: "near" | "eth"
) => {
  if (chain == "near") {
    const account = await getAccount();
    const txn = await account.transfer({
      token: NEAR,
      amount: NEAR.toUnits(amount.toString()),
      receiverId,
    });

    console.log(txn.final_execution_status);

    return txn;
  } else if (chain === "eth") {
    const { address: senderAddress } = await Evm.deriveAddressAndPublicKey(
      process.env.NEXT_PUBLIC_contractId,
      "ethereum-1"
    );

    const { transaction, hashesToSign } =
      await Evm.prepareTransactionForSigning({
        from: senderAddress,
        to: receiverId,
        data: "0x",
        value: parseEther(amount.toString()),
      });

    console.log("txn", transaction);

    const signRes = await requestSignature({
      path: "ethereum-1",
      payload: uint8ArrayToHex(hashesToSign[0]),
    });

    console.log("first", signRes);

    const signedTransaction = Evm.finalizeTransactionSigning({
      transaction,
      rsvSignatures: [toRSV(signRes)],
    });

    console.log("second", signedTransaction);

    const txHash = await Evm.broadcastTx(signedTransaction);

    return txHash;
  }
};

export const verifyDeposit = async (
  chain: "near" | "eth",
  txHash: string
): Promise<{ success: boolean; message: string; data?: any }> => {
  try {
    const { nearAccount, ethAccount } = await agentAccount();

    if (chain === "near") {
      const { data }: { data: INearApiResponse } = await axios.get(
        `https://api-testnet.nearblocks.io/v2/txns/${txHash}/receipts`
      );

      const main = data.receipts[0].receipt_tree;
      if (!main) return { success: false, message: "Txn reciept not found" };

      if (main.receiver_account_id !== nearAccount) {
        return {
          success: false,
          message: "Txn not done for proper shade agent account",
        };
      }

      return { success: true, data, message: "Found proper txn" };
    } else if (chain === "eth") {
      const { data }: { data: SepoliaTransactionResponse } = await axios.get(
        `https://base-sepolia.blockscout.com/api/v2/transactions/${txHash}`
      );

      if (!data) {
        return { success: false, message: "Txn not found" };
      }

      const recieverAccount = data.to.hash;

      if (recieverAccount !== ethAccount) {
        return {
          success: false,
          message: "Txn not done for proper shade agent account",
        };
      }

      return { success: true, data, message: "Found proper txn" };
    } else {
      return {
        success: false,
        message: "Must be eth or near",
      };
    }
  } catch (error) {
    return { success: true, message: "Txn not found" };
  }
};
