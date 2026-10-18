export interface PoolLiquidity {
  id: string;
  dexName: string;
  tokenIn: string;
  tokenOut: string;
  reserveIn: bigint;
  reserveOut: bigint;
  feeBps: bigint;
}

export interface RouteHop {
  poolId: string;
  dexName: string;
  tokenIn: string;
  tokenOut: string;
  feeBps: bigint;
}

export interface SplitRoutePath {
  percentBps: bigint;
  amountIn: bigint;
  expectedAmountOut: bigint;
  hops: RouteHop[];
}

export interface AggregatedRouteQuote {
  tokenIn: string;
  tokenOut: string;
  totalAmountIn: bigint;
  totalExpectedAmountOut: bigint;
  minAmountOut: bigint;
  slippageToleranceBps: bigint;
  priceImpactBps: bigint;
  executionPriceWad: bigint;
  paths: SplitRoutePath[];
}

export type AdminActionType =
  | "REGISTER_POOL"
  | "UPDATE_POOL_RESERVES"
  | "SET_POOL_FEE"
  | "SET_POOL_PAUSED";

export interface SignedAdminIntent {
  action: AdminActionType;
  params: Record<string, any>;
  nonce: number;
  deadline: number;
  domain: string;
  signature: string;
}

export interface SwapExecutionResult {
  txId: string;
  tokenIn: string;
  tokenOut: string;
  amountIn: bigint;
  expectedAmountOut: bigint;
  actualAmountOut: bigint;
  minAmountOut: bigint;
  priceImpactBps: bigint;
  recipient: string;
  pathsUsed: number;
  timestamp: number;
  success: boolean;
}

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

export interface EngineLike {
  findBestRoute(tokenIn: string, tokenOut: string, amountIn: bigint, options?: any): AggregatedRouteQuote;
  executeSwap(quote: AggregatedRouteQuote, recipient: string): Promise<SwapExecutionResult> | SwapExecutionResult;
  executeAdminIntent(intent: SignedAdminIntent): void;
  getPool(poolId: string): PoolLiquidity | undefined;
}
