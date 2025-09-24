export interface INearBlock {
  block_hash: string;
  block_height: number;
  block_timestamp: string;
}

export interface INearActionArgs {
  deposit: string;
}

export interface INearAction {
  args: INearActionArgs;
  rlp_hash: string | null;
  action_kind: string;
}

export interface INearOutcome {
  logs: string[] | null;
  result: string;
  status: boolean;
  gas_burnt: string;
  status_key: string;
  tokens_burnt: string;
  executor_account_id: string;
}

export interface INearReceiptTree {
  block: INearBlock;
  actions: INearAction[];
  outcome: INearOutcome;
  receipts: any[];
  public_key: string;
  receipt_id: string;
  receiver_account_id: string;
  predecessor_account_id: string;
}

export interface INearReceipt {
  receipt_tree: INearReceiptTree;
}

export interface INearApiResponse {
  receipts: INearReceipt[];
}
