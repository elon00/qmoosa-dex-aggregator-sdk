import { test } from "node:test";
import assert from "node:assert/strict";
import { DexAggregatorEngine } from "@qmoosa/dex-aggregator-engine";
import { DexAggregatorClient, generateKeyPair } from "../dist/index.js";

function setupClient() {
  const { publicKey, privateKey } = generateKeyPair();
  const engine = new DexAggregatorEngine(publicKey, 31337);

  engine.registerPoolDirect({
    id: "pool_uniswap_usdc_weth",
    dexName: "UniswapV2",
    tokenIn: "USDC",
    tokenOut: "WETH",
    reserveIn: 1_000_000n * 10n ** 6n,
    reserveOut: 500n * 10n ** 18n,
    feeBps: 30n
  });

  engine.registerPoolDirect({
    id: "pool_sushi_usdc_weth",
    dexName: "Sushiswap",
    tokenIn: "USDC",
    tokenOut: "WETH",
    reserveIn: 1_000_000n * 10n ** 6n,
    reserveOut: 500n * 10n ** 18n,
    feeBps: 30n
  });

  const client = new DexAggregatorClient(engine, {
    aggregatorContractAddress: "0xAggregatorRouterV1",
    defaultSlippageBps: 50n,
    defaultDeadlineSeconds: 600
  });

  return { client, engine, publicKey, privateKey };
}

test("1. DexAggregatorClient route quote discovery", () => {
  const { client } = setupClient();
  const quote = client.getBestRoute("USDC", "WETH", 5000n * 10n ** 6n);

  assert.equal(quote.tokenIn, "USDC");
  assert.equal(quote.tokenOut, "WETH");
  assert.ok(quote.totalExpectedAmountOut > 0n);
  assert.ok(quote.minAmountOut > 0n);
  assert.equal(quote.slippageToleranceBps, 50n);
});

test("2. Swap transaction payload builder & calldata formatting", () => {
  const { client } = setupClient();
  const quote = client.getBestRoute("USDC", "WETH", 10_000n * 10n ** 6n);

  const payload = client.buildSwapTransactionPayload(quote, "0xRecipientUser");
  assert.equal(payload.to, "0xAggregatorRouterV1");
  assert.equal(payload.recipient, "0xRecipientUser");
  assert.equal(payload.amountIn, 10_000n * 10n ** 6n);
  assert.equal(payload.minAmountOut, quote.minAmountOut);
  assert.ok(payload.deadline > Math.floor(Date.now() / 1000));
  assert.ok(payload.legs.length > 0);
});

test("3. Zero / invalid recipient fails closed", () => {
  const { client } = setupClient();
  const quote = client.getBestRoute("USDC", "WETH", 10_000n * 10n ** 6n);

  assert.throws(
    () => client.buildSwapTransactionPayload(quote, ""),
    /INVALID_RECIPIENT_ADDRESS/
  );
  assert.throws(
    () => client.buildSwapTransactionPayload(quote, "0x0000000000000000000000000000000000000000"),
    /INVALID_RECIPIENT_ADDRESS/
  );
});

test("4. Admin intent signing and execution via SDK client", () => {
  const { client, privateKey } = setupClient();

  const intent = client.signAndExecuteAdminIntent(
    "REGISTER_POOL",
    {
      id: "pool_curve_usdc_dai",
      dexName: "Curve",
      tokenIn: "USDC",
      tokenOut: "DAI",
      reserveIn: 2_000_000n * 10n ** 6n,
      reserveOut: 2_000_000n * 10n ** 18n,
      feeBps: 4
    },
    privateKey
  );

  assert.equal(intent.action, "REGISTER_POOL");
  const pool = client.getPool("pool_curve_usdc_dai");
  assert.ok(pool);
  assert.equal(pool.dexName, "Curve");
});

test("5. End-to-end atomic swap execution via client", async () => {
  const { client } = setupClient();
  const quote = client.getBestRoute("USDC", "WETH", 5000n * 10n ** 6n);

  const receipt = await client.executeSwap(quote, "0xArbitrageurTrader");
  assert.equal(receipt.success, true);
  assert.equal(receipt.recipient, "0xArbitrageurTrader");
  assert.ok(receipt.actualAmountOut >= quote.minAmountOut);
});
