import {
  AggregatedRouteQuote,
  SwapExecutionResult,
  AdminActionType,
  SignedAdminIntent,
  PoolLiquidity,
  DexAggregatorTransactionPayload,
  ClientConfig,
  EngineLike
} from "./types.js";
import { signAdminIntent } from "./crypto.js";

export class DexAggregatorClient {
  private readonly engine: EngineLike;
  private readonly aggregatorAddress: string;
  private readonly defaultSlippageBps: bigint;
  private readonly defaultDeadlineSeconds: number;
  private readonly chainId: number;
  private lastNonce: number = 0;

  constructor(
    engine: EngineLike,
    config: ClientConfig = {},
    chainId: number = 31337
  ) {
    this.engine = engine;
    this.aggregatorAddress = config.aggregatorContractAddress || "0xDexAggregatorRouter";
    this.defaultSlippageBps = config.defaultSlippageBps ?? 50n; // 0.5%
    this.defaultDeadlineSeconds = config.defaultDeadlineSeconds ?? 300; // 5 mins
    this.chainId = chainId;
  }

  public getPool(id: string): PoolLiquidity | undefined {
    return this.engine.getPool(id);
  }

  public getAllPools(): PoolLiquidity[] {
    return (this.engine as any).getAllPools ? (this.engine as any).getAllPools() : [];
  }

  public getBestRoute(
    tokenIn: string,
    tokenOut: string,
    amountIn: bigint,
    slippageToleranceBps?: bigint
  ): AggregatedRouteQuote {
    return this.engine.findBestRoute(tokenIn, tokenOut, amountIn, {
      slippageToleranceBps: slippageToleranceBps ?? this.defaultSlippageBps
    });
  }

  public buildSwapTransactionPayload(
    quote: AggregatedRouteQuote,
    recipient: string,
    deadline?: number
  ): DexAggregatorTransactionPayload {
    if (!recipient || recipient === "0x0000000000000000000000000000000000000000") {
      throw new Error("INVALID_RECIPIENT_ADDRESS");
    }

    const expiry = deadline ?? Math.floor(Date.now() / 1000) + this.defaultDeadlineSeconds;

    const legs = quote.paths.flatMap(p =>
      p.hops.map(h => ({
        pool: h.poolId,
        tokenIn: h.tokenIn,
        tokenOut: h.tokenOut,
        amountIn: p.amountIn
      }))
    );

    const calldataEstimate = `0xexecuteSwap_${quote.tokenIn}_${quote.tokenOut}_${quote.totalAmountIn.toString(16)}_${quote.minAmountOut.toString(16)}`;

    return {
      to: this.aggregatorAddress,
      tokenIn: quote.tokenIn,
      tokenOut: quote.tokenOut,
      amountIn: quote.totalAmountIn,
      minAmountOut: quote.minAmountOut,
      recipient,
      deadline: expiry,
      legs,
      calldataEstimate
    };
  }

  public async executeSwap(
    quote: AggregatedRouteQuote,
    recipient: string = "0xTrader"
  ): Promise<SwapExecutionResult> {
    return this.engine.executeSwap(quote, recipient);
  }

  public signAndExecuteAdminIntent(
    action: AdminActionType,
    params: Record<string, any>,
    privateKeyPem: string,
    nonce?: number,
    deadline?: number
  ): SignedAdminIntent {
    const nextNonce = nonce !== undefined ? nonce : ++this.lastNonce;
    const expiry = deadline !== undefined ? deadline : Math.floor(Date.now() / 1000) + 3600;
    const domain = `QMOOSA:DEX_AGGREGATOR:${this.chainId}`;

    const intent = signAdminIntent(action, params, nextNonce, expiry, domain, privateKeyPem);
    this.engine.executeAdminIntent(intent);
    return intent;
  }
}
