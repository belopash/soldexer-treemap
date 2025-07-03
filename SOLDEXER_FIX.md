Soldexer swaps with prices stream

```ts
import path from 'node:path'
import {NodeClickHouseClient} from '@clickhouse/client/dist/client'
import {ClickHouseClient, ClickhouseState} from '@sqd-pipes/core'
import {ensureTables} from '../db/clickhouse'
import {IndexerFunction, PipeConfig} from '../main'
import {SolanaSwap, SolanaSwapsStream} from '../streams/swaps'
import {getSortFunction, logger} from '../utils'

export const TOKENS = {
    USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
    USDS: 'USDSwr9ApdHk5bvJKMjzff41FfuX8bSxdKcR81vTwcA',
    SOL: 'So11111111111111111111111111111111111111112',
}

const TRACKED_TOKENS = [TOKENS.USDC, TOKENS.USDT, TOKENS.SOL]

const sortTokens = getSortFunction(TRACKED_TOKENS)

export const pricesIndexer: IndexerFunction = async (
    portalUrl: string,
    client: NodeClickHouseClient,
    config: PipeConfig
) => {
    await ensureTables(client, path.join(__dirname, '../db/sql/swaps_prices.sql'))

    const ds = new SolanaSwapsStream({
        portal: `${portalUrl}/datasets/solana-mainnet`,
        blockRange: {
            from: config.fromBlock,
        },
        args: {
            tokens: [
                'rndrizKT3MK1iimdxRdWabcF7Zg7AR5T4nud4EkHBof', // render
                '9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump', // fartcoin
                '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R', // raydium
                'HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3', // pyth
                'jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL', // jto
                '85VBFQZC9TZkfaptBWjvUw7YbZjy52A6mjtPGjstQAmQ', // wormhole
                'DriFtupJYLTosbwoN8koMbEYSx54aFAVLddWsbksjwg7', // drift
                'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE', // orca
                'MEFNBXixkEbait3xn9bkm8WsJzXtVsaJEn4c8Sam21u', // magic eden
                'METAewgxyPbgwsseH8T16a39CQ5VyVxZi9zXiDPY18m', // metaplex
                'mb1eu7TzEc71KxDpsmsKoucSSuuoGLv1drys1oP2jh6', // helium mobile
                'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // usdc
                'So11111111111111111111111111111111111111112', // sol
                'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', // usdt
                '3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh', // wbtc
                '7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs', // eth
                'HzwqbKZw8HxMN6bF2yFZNrht3c2iXXzpKcFu7uBEDKtr', // eurc
                'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn', // jitoSOL
                'USDSwr9ApdHk5bvJKMjzff41FfuX8bSxdKcR81vTwcA', // usds
                '27G8MtK7VtTcCHkpASjSDdkWWYfoqT6ggEuKidVJidD4', // jpt
                'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN', // jup
                '6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN', // trump
                'cbbtcf3aa214zXHbiAZQwf4122FBYbraNdFqgw4iMij', // cbbtc
                'HDa3zJc12ahykSsBRvgiWzr6WLEByf36yzKKbVvy4gnF', // sos
                'CSP4RmB6kBHkKGkyTnzt9zYYXDA8SbZ5Do5WfZcjqjE4', // hnt
            ],
            type: ['orca_whirlpool', 'raydium_clmm', 'raydium_amm'],
        },
        state: new ClickhouseState(client, {
            table: 'solana_sync_status',
            id: 'solana_swaps_prices_raw',
        }),
        logger,
    })

    const stream = await ds.stream()

    for await (const swaps of stream.pipeThrough(await new SvmUsdcAmountsAggregatorStream(client).pipe())) {
        const values = swaps
            .filter((s) => s.input.amount > 0 && s.output.amount > 0)
            .map((s) => {
                const needTokenSwap = sortTokens(s.input.mint, s.output.mint)

                const tokenA = !needTokenSwap ? s.input : s.output
                const tokenB = !needTokenSwap ? s.output : s.input

                return {
                    dex: s.type,
                    block_number: s.block.number,
                    transaction_hash: s.transaction.hash,
                    transaction_index: s.transaction.index,
                    instruction_address: s.instruction.address,
                    account: s.account,
                    token_a: tokenA.mint,
                    token_b: tokenB.mint,
                    amount_a: (((needTokenSwap ? -1 : 1) * Number(tokenA.amount)) / 10 ** tokenA.decimals).toString(),
                    amount_b: (((needTokenSwap ? 1 : -1) * Number(tokenB.amount)) / 10 ** tokenB.decimals).toString(),
                    token_a_usdc_price: tokenA.usdc_price,
                    token_b_usdc_price: tokenB.usdc_price,
                    timestamp: s.timestamp,
                    sign: 1,
                }
            })

        await client.insert({
            table: 'solana_swaps_prices_raw',
            values,
            format: 'JSONEachRow',
        })

        await ds.ack()
    }
}

function getPrice(tokenA: any, tokenB: any) {
    const a = Number(tokenA.amount) / 10 ** tokenA.decimals
    const b = Number(tokenB.amount) / 10 ** tokenB.decimals

    return Math.abs(b / a)
}

export type ExtendedSolanaSwap = SolanaSwap & {
    input: {
        amount: bigint
        mint: string
        decimals: number
        usdc_price: number
        balance: number
        profit_usdc: number
        cost_usdc: number
        token_acquisition_cost_usd: number
    }
    output: {
        amount: bigint
        mint: string
        decimals: number
        usdc_price: number
        balance: number
        profit_usdc: number
        cost_usdc: number
        token_acquisition_cost_usd: number
    }
}

export class SvmUsdcAmountsAggregatorStream {
    constructor(private client?: ClickHouseClient) {}

    private async *restoreTokenPrices() {
        if (!this.client) return

        // Get latest token prices from swaps where one token is USDC
        const result = await this.client.query({
            query: `
            SELECT token_a as token, token_a_usdc_price as price
            FROM solana_swaps_prices_raw
            WHERE token_a = '${TOKENS.SOL}'
            AND token_b = '${TOKENS.USDC}'
            AND sign > 0
            ORDER BY timestamp DESC
            LIMIT 1
        `,
            format: 'JSONEachRow',
        })

        for await (const rows of result.stream<{token: string; price: number}>()) {
            for (const row of rows) {
                yield row.json()
            }
        }
    }

    async pipe(): Promise<TransformStream<SolanaSwap[], ExtendedSolanaSwap[]>> {
        const tokenPrices = new Map<string, number>()
        const accountPairs = new Map<string, {amount: number; weightedPrice: number}>()

        return new TransformStream({
            start: async () => {
                for await (const row of this.restoreTokenPrices()) {
                    tokenPrices.set(row.token, row.price)
                }
            },
            transform: (swaps: ExtendedSolanaSwap[], controller) => {
                for (const swap of swaps) {
                    const needTokenSwap = sortTokens(swap.input.mint, swap.output.mint)

                    const tokenA = !needTokenSwap ? swap.input : swap.output
                    const tokenB = !needTokenSwap ? swap.output : swap.input

                    const amountA = Number(tokenA.amount) / 10 ** tokenA.decimals
                    const amountB = Number(tokenB.amount) / 10 ** tokenB.decimals

                    let priceA = 0
                    let priceB = 0

                    const holdingA = accountPairs.get(`${tokenA.mint}:${swap.account}`) || {
                        amount: 0,
                        weightedPrice: 0,
                    }
                    const holdingB = accountPairs.get(`${tokenB.mint}:${swap.account}`) || {
                        amount: 0,
                        weightedPrice: 0,
                    }

                    if (tokenB.mint === TOKENS.USDC || tokenB.mint === TOKENS.USDT || tokenB.mint === TOKENS.USDS) {
                        priceA = getPrice(tokenA, tokenB)
                        priceB = 1

                        if (tokenA.mint === TOKENS.SOL) {
                            tokenPrices.set(tokenA.mint, priceA)
                        }
                    } else if (tokenB.mint === TOKENS.SOL) {
                        const priceRelativeToSol = getPrice(tokenA, tokenB)
                        const latestSolUsdcPrice = tokenPrices.get(TOKENS.SOL) || 0

                        priceA = latestSolUsdcPrice * priceRelativeToSol
                        priceB = latestSolUsdcPrice
                    }

                    tokenA.usdc_price = priceA
                    tokenB.usdc_price = priceB

                    if (needTokenSwap) {
                        tokenA.balance = holdingA.amount + amountA
                        tokenA.profit_usdc = 0
                        tokenA.cost_usdc = 0
                        tokenA.token_acquisition_cost_usd =
                            (holdingA.amount * holdingA.weightedPrice + amountA * priceA) / tokenA.balance
                    } else {
                        tokenA.balance = Math.max(holdingA.amount - amountA, 0)
                        tokenA.profit_usdc = Math.min(holdingA.amount, amountA) * (priceA - holdingA.weightedPrice)
                        tokenA.cost_usdc = Math.min(holdingA.amount, amountA) * holdingA.weightedPrice
                        tokenA.token_acquisition_cost_usd = holdingA.weightedPrice
                    }
                    holdingA.weightedPrice = tokenA.token_acquisition_cost_usd
                    holdingA.amount = tokenA.balance
                    accountPairs.set(`${tokenA.mint}:${swap.account}`, holdingA)

                    if (!needTokenSwap) {
                        tokenB.balance = holdingB.amount + amountB
                        tokenB.profit_usdc = 0
                        tokenB.cost_usdc = 0
                        tokenB.token_acquisition_cost_usd =
                            (holdingB.amount * holdingB.weightedPrice + amountB * priceB) / tokenB.balance
                    } else {
                        tokenB.balance = Math.max(holdingB.amount - amountB, 0)
                        tokenB.profit_usdc = Math.min(holdingB.amount, amountB) * (priceB - holdingB.weightedPrice)
                        tokenB.cost_usdc = Math.min(holdingB.amount, amountB) * holdingB.weightedPrice
                        tokenB.token_acquisition_cost_usd = holdingB.weightedPrice
                    }

                    holdingB.weightedPrice = tokenB.token_acquisition_cost_usd
                    holdingB.amount = tokenB.balance
                    accountPairs.set(`${tokenB.mint}:${swap.account}`, holdingB)
                }

                controller.enqueue(swaps)
            },
        })
    }
}
```

Table
```sql
CREATE TABLE IF NOT EXISTS solana_swaps_prices_raw
(
    timestamp                    DateTime CODEC (DoubleDelta, ZSTD),
    dex                          LowCardinality(String),
    token_a                      String,
    token_b                      String,
    amount_a                     Float64,
    amount_b                     Float64,
    token_a_usdc_price           Float64,
    token_b_usdc_price           Float64,
    token_a_balance              Float64,
    token_a_acquisition_cost_usd Float64,
    token_b_balance              Float64,
    token_b_acquisition_cost_usd Float64,
    token_a_profit_usdc          Float64,
    token_b_profit_usdc          Float64,
    token_a_cost_usdc            Float64,
    token_b_cost_usdc            Float64,
    account                      String,
    block_number                 UInt32 CODEC (DoubleDelta, ZSTD),
    transaction_index            UInt16,
    instruction_address          Array (UInt16),
    transaction_hash             String,
    sign                         Int8,
    INDEX idx_account_timestamp (timestamp, account) TYPE minmax GRANULARITY 1,
    INDEX idx_account (account) TYPE bloom_filter(0.01) GRANULARITY 1,
    INDEX amount_a_idx amount_a TYPE minmax GRANULARITY 4
) ENGINE = CollapsingMergeTree(sign)
      PARTITION BY toYYYYMM(timestamp) -- DATA WILL BE SPLIT BY MONTH
      ORDER BY (block_number, transaction_index, instruction_address);
```