export interface AddressInfo {
  ens_domain_name: string | null;
  hash: string;
  implementations: any[];
  is_contract: boolean;
  is_scam: boolean;
  is_verified: boolean;
  metadata: any | null;
  name: string | null;
  private_tags: any[];
  proxy_type: string | null;
  public_tags: any[];
  reputation: string;
  watchlist_names: any[];
}

export interface TransactionFee {
  type: string;
  value: string;
}

export interface SepoliaTransactionResponse {
  l1_gas_used: string;
  priority_fee: string;
  raw_input: string;
  is_pending_update: boolean;
  op_withdrawals: any[];
  result: string;
  hash: string;
  max_fee_per_gas: string;
  revert_reason: string | null;
  confirmation_duration: [number, number];
  transaction_burnt_fee: string;
  type: number;
  token_transfers_overflow: boolean;
  confirmations: number;
  position: number;
  max_priority_fee_per_gas: string;
  transaction_tag: string | null;
  created_contract: string | null;
  value: string;
  l1_fee_scalar: string;
  from: AddressInfo;
  gas_used: string;
  status: string;
  to: AddressInfo;
  authorization_list: any[];
  l1_fee: string;
  method: string | null;
  fee: TransactionFee;
  actions: any[];
  gas_limit: string;
  gas_price: string;
  decoded_input: any | null;
  l1_gas_price: string;
  token_transfers: any[];
  base_fee_per_gas: string;
  timestamp: string;
  nonce: number;
  historic_exchange_rate: any | null;
  transaction_types: string[];
  exchange_rate: any | null;
  block_number: number;
  has_error_in_internal_transactions: boolean;
}