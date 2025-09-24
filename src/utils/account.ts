import { NEAR } from "@near-js/tokens";
import { getAccount } from "@neardefi/shade-agent-js";
import { type Account } from "@near-js/accounts";

// Currently transfer only near assets
export const transferAssets = async (amount: number, receiverId: string) => {
  try {
    const account: Account = await getAccount();
    const txn = await account.transfer({
      token: NEAR,
      amount: NEAR.toUnits(amount.toString()),
      receiverId,
    });

    console.log(txn.final_execution_status);

    return txn;
  } catch (err) {
    console.log(err);
  }
};
