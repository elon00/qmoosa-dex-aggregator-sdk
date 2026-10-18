export * from "@qmoosa/dex-aggregator-protocol";
export * from "@qmoosa/dex-aggregator-engine";

export interface DexAggregatorTransactionPayload {
  to: string;
  tokenIn: string;
  tokenOut: string;
  amountIn: bigint;
  minAmountOut: bigint;
  recipient: string;
  deadline: number;
  legs: Array<{
    pool: string;
    tokenIn: string;
    tokenOut: string;
    amountIn: bigint;
  }>;
  calldataEstimate: string;
}

export interface ClientConfig {
  aggregatorContractAddress?: string;
  defaultSlippageBps?: bigint;
  defaultDeadlineSeconds?: number;
}
