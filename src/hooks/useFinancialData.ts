import {useState, useEffect} from 'react'
import {getClickHouseClient} from '../clickhouse'

export interface TokenChanges {
    address: string
    start_price: number
    end_price: number
}

export interface TokenData {
    name: string
    symbol: string
    category: string
    address: string
    startPrice: number
    endPrice: number
}

const clickhouseClient = getClickHouseClient()

export const useTokensData = () => {
    const [data, setData] = useState<TokenData[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Function to fetch data from ClickHouse or use mock data as fallback
    const fetchData = async (): Promise<void> => {
        try {
            setLoading(true)
            setError(null)

            // Try to fetch data from ClickHouse
            const clickhouseData = await clickhouseClient.query({
                query: `
                    SELECT
                        address,
                        first_value(price) as start_price,
                        last_value(price) as end_price
                    FROM (SELECT * FROM (
                        SELECT
                            timestamp,
                            token_a as address,
                            token_a_usdc_price as price
                        FROM solana_swaps_prices_raw
                        UNION ALL
                        SELECT
                            timestamp,
                            token_a as address,
                            token_a_usdc_price as price
                        FROM solana_swaps_prices_raw
                    ) as t
                    WHERE price > 0 AND address IN (${tokens.map((token) => `'${token.address}'`).join(',')})
                    ORDER BY timestamp
                    )
                    GROUP BY address
                `,
                format: 'JSONEachRow',
            })
            const rows = (await clickhouseData.json()) as TokenChanges[]

            setData(
                rows
                    .map((row) => {
                        const token = tokensMap.get(row.address)
                        if (!token) return null
                        return {
                            name: token.name,
                            symbol: token.symbol,
                            category: token.category,
                            address: row.address,
                            startPrice: row.start_price,
                            endPrice: row.end_price,
                        }
                    })
                    .filter((row) => row !== null)
            )
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
            console.error('Data fetching error:', err)

            setError(`Using mock data due to error: ${errorMessage}`)
        } finally {
            setLoading(false)
        }
    }

    // Refresh function
    const refresh = async (): Promise<void> => {
        await fetchData()
    }

    // Initial data fetch
    useEffect(() => {
        fetchData()
    }, [])

    return {
        data,
        loading,
        error,
        refresh,
    }
}

const tokens = [
    {
        name: 'Official Trump',
        symbol: 'TRUMP',
        address: '6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN',
        category: 'Meme',
    },
    {
        name: 'USDC',
        symbol: 'USDC',
        address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        category: 'Stablecoin',
    },
    {
        name: 'Jupiter',
        symbol: 'JUP',
        address: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
        category: 'DeFi',
    },
    {
        name: 'Wrapped SOL',
        symbol: 'WSOL',
        address: 'So11111111111111111111111111111111111111112',
        category: 'DeFi',
    },
    {
        name: 'USDT',
        symbol: 'USDT',
        address: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
        category: 'Stablecoin',
    },
    {
        name: 'JITO',
        symbol: 'JTO',
        address: 'jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL',
        category: 'DeFi',
    },
    {
        name: 'Jupiter Perps LP',
        symbol: 'JLP',
        address: '27G8MtK7VtTcCHkpASjSDdkWWYfoqT6ggEuKidVJidD4',
        category: 'DeFi',
    },
    {
        name: 'Bonk',
        symbol: 'BONK',
        address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
        category: 'Meme',
    },
    {
        name: 'Render',
        symbol: 'RENDER',
        address: 'rndrizKT3MK1iimdxRdWabcF7Zg7AR5T4nud4EkHBof',
        category: 'DePIN',
    },
    {
        name: 'Binance Staked SOL',
        symbol: 'BNSOL',
        address: 'BNso1VUJnh4zcfpZa6986Ea66P6TCp59hvtNJ8b1X85',
        category: 'DeFi',
    },
    {
        name: 'Pudgy Penguins',
        symbol: 'PENGU',
        address: '2zMMhcVQEXDtdE6vsFS7S7D5oUodfJHE8vd1gnBouauv',
        category: 'NFT',
    },
    {
        name: 'Fartcoin',
        symbol: 'Fartcoin',
        address: '9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump',
        category: 'Meme',
    },
    {
        name: 'Raydium',
        symbol: 'Ray',
        address: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
        category: 'DeFi',
    },
    {
        name: 'Grass',
        symbol: 'GRASS',
        address: 'Grass7B4RdKfBCjTKgSqnXkqjwiGvQyFbuSCUJr3XXjs',
        category: 'AI',
    },
    {
        name: 'Pyth Network',
        symbol: 'Pyth',
        address: 'HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3',
        category: 'Infra',
    },
    {
        name: 'dogwifhat',
        symbol: '$WIF',
        address: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm',
        category: 'Meme',
    },
    {
        name: 'Jupiter Staked SOL',
        symbol: 'JupSOL',
        address: 'jupSoLaHXQiZZTSfEWMTRRgpnyFm8f6sZdosWBjx93v',
        category: 'DeFi',
    },
    {
        name: 'Magic Eden',
        symbol: 'ME',
        address: 'MEFNBXixkEbait3xn9bkm8WsJzXtVsaJEn4c8Sam21u',
        category: 'NFTs',
    },
    {
        name: 'Wormhole Token',
        symbol: 'W',
        address: '85VBFQZC9TZkfaptBWjvUw7YbZjy52A6mjtPGjstQAmQ',
        category: 'Infra',
    },
    {
        name: 'Solayer',
        symbol: 'LAYER',
        address: 'LAYER4xPpTCb3QL8S9u41EAhAX7mhBn8Q6xMTwY2Yzc',
        category: 'Infra',
    },
    {
        name: 'Kamino',
        symbol: 'KMNO',
        address: 'KMNo3nJsBXfcpJTVhZcXLW7RmTwTt4GVFE7suUBo9sS',
        category: 'DeFi',
    },
    {
        name: 'IO',
        symbol: 'IO',
        address: 'BZLbGTNCSFfoth2GYDtwr7e4imWzpR5jqcUuGEwr646K',
        category: 'DePIN',
    },
    {
        name: 'Sonic VM',
        symbol: 'SONIC',
        address: 'SonicxvLud67EceaEzCLRnMTBqzYUUYNr93DBkBdDES',
        category: 'Infra',
    },
    {
        name: 'Drift',
        symbol: 'DRIFT',
        address: 'DriFtupJYLTosbwoN8koMbEYSx54aFAVLddWsbksjwg7',
        category: 'DeFi',
    },
    {
        name: 'Wrapped Ethereum (Sollet)',
        symbol: 'ETH',
        address: '2FPyTwcZLUg1MDrwsyoP4D6s1tM7hAkHYRjkNb5w6Pxk',
        category: 'DeFi',
    },
    {
        name: 'Wrapped Bitcoin',
        symbol: 'WBTC',
        address: '3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh',
        category: 'DeFi',
    },
    {
        name: 'Huma Finance',
        symbol: 'HUMA',
        address: 'HUMA1821qVDKta3u2ovmfDQeW2fSQouSKE8fkF44wvGw',
        category: 'DeFi',
    },
    {
        name: 'Zebec Network',
        symbol: 'ZBCN',
        address: 'ZBCNpuD7YMXzTHB2fhGkGi78MNsHGLRXUhRewNRm9RU',
        category: 'Infra',
    },
    {
        name: 'Coinbase wrapped BTC',
        symbol: 'cbBTC',
        address: 'cbbtcf3aa214zXHbiAZQwf4122FBYbraNdFqgw4iMij',
        category: 'DeFi',
    },
    {
        name: 'ByBitSOL',
        symbol: 'bbSOL',
        address: 'Bybit2vBJGhPF52GBdNaQfUJ6ZpThSgHBobjWZpLPb4B',
        category: 'DeFi',
    },
    {
        name: 'Bitradex Token',
        symbol: 'BTX',
        address: '4Z8wM5BEVD5RHZ79AJ5XUN23tsEWSGZne2qqNm647Q9o',
        category: 'AI',
    },
    {
        name: 'Oxygen Protocol',
        symbol: 'OXY',
        address: 'z3dn17yLaGMKffVogeFHQ9zWVcXgqgf3PQnDsNs2g6M',
        category: 'DeFi',
    },
    {
        name: 'Verse World',
        symbol: 'Verse',
        address: 'vRseBFqTy9QLmmo5qGiwo74AVpdqqMTnxPqWoWMpump',
        category: 'Gaming',
    },
    {
        name: 'vSOl',
        symbol: 'vSOL',
        address: 'vSoLxydx6akxyMD9XEcPvGYNGq6Nn66oqVb3UkGkei7',
        category: 'DeFi',
    },
    {
        name: 'Drift staked Sol',
        symbol: 'dSOL',
        address: 'Dso1bDeDjCQxTrWHqUUi63oBvV7Mdm6WaobLbQ7gnPQ',
        category: 'DeFi',
    },
    {
        name: 'cat in a dogs world',
        symbol: 'MEW',
        address: 'MEW1gQWJ3nEXg2qgERiKu7FAFj79PHvQVREQUzScPP5',
        category: 'Meme',
    },
    {
        name: 'Peanut the squirrel',
        symbol: 'Pnut',
        address: '2qEHjDLDLbuBgRYvsxhc5D6uDWAivNFZGan56P1tpump',
        category: 'Meme',
    },
    {
        name: 'Moo Deng',
        symbol: 'MOO',
        address: 'ED5nyyWEzpPPiWimP8vYm7sD7TD3LAt3Q3gRTWHzPJBY',
        category: 'Meme',
    },
    {
        name: 'Wrapped ETH',
        symbol: 'wETH',
        address: '7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs',
        category: 'DeFi',
    },
    {
        name: 'ai16z',
        symbol: 'ai16z',
        address: 'HeLp6NuQkmYB4pYWo2zYs22mESHXPQYzXbB8n4V98jwC',
        category: 'AI',
    },
    {
        name: 'ZEUS',
        symbol: 'ZEUS',
        address: 'ZEUS1aR7aX8DFFJf5QjWj2ftDDdNTroMNGo8YoQm3Gq',
        category: 'DeFi',
    },
    {
        name: 'Ondo US Dollar Yield',
        symbol: 'USDY',
        address: 'A1KLoBrKBde8Ty9qtNQUtq3C2ortoC3u7twggz7sEto6',
        category: 'DeFi',
    },
    {
        name: 'Shisha Coin',
        symbol: 'SHISHA',
        address: 'shixxut6zHRKnbCVqzBDB6tDBFWKqds92gu9n1HXj5i',
        category: 'Meme',
    },
    {
        name: 'SPX6900 (Wormhole)',
        symbol: 'SPX',
        address: 'J3NKxxXZcnNiMjKw9hYb2K4LUxgwB6t1FtPtQVsv3KFr',
        category: 'DeFi',
        '': 'Stocks',
    },
    {
        name: 'Marinade',
        symbol: 'MNDE',
        address: 'MNDEFzGvMt87ueuHvVU9VcTqsAP5b3fTGPsHuuPA5ey',
        category: 'DeFi',
    },
    {
        name: 'Tensor',
        symbol: 'TNSR',
        address: 'TNSRxcUxoT9xBG3de7PiJyTDYu7kskLqcpddxnEJAS6',
        category: 'NFT',
    },
    {
        name: 'Serum',
        symbol: 'SRM',
        address: 'SRMuApVNdxXokk5GT7XD5cUUgXMBCoAz2LHeuAoKWRt',
        category: 'DeFi',
    },
    {
        name: 'Metaplex',
        symbol: 'MPLX',
        address: 'METAewgxyPbgwsseH8T16a39CQ5VyVxZi9zXiDPY18m',
        category: 'NFT',
    },
    {
        name: 'BOOK OF MEME',
        symbol: 'BOME',
        address: 'ukHH6c7mMyiWCf1b9pnWe25TSpkDDt3H5pQZgZ74J82',
        category: 'Meme',
    },
    {
        name: 'Cloud',
        symbol: 'CLOUD',
        address: 'CLoUDKc4Ane7HeQcPpE3YHnznRxhMimJ4MyaUqyHFzAu',
        category: 'DeFi',
    },
    {
        name: 'Goatseus Maximus',
        symbol: 'GOAT',
        address: 'CzLSujWBLFsSjncfkh59rUFqvafWcY5tzedWJSuypump',
        category: 'Meme',
    },
    {
        name: 'ROVR Network',
        symbol: 'ROVR',
        address: 'FgQ3sxj54SmVzttkxuK4bdiEnUNi6kF9Hyx3ezKW72hn',
        category: 'DePIN',
    },
    {
        name: 'Solayer SOL',
        symbol: 'sSOL',
        address: 'sSo14endRuUbvQaJS3dq36Q829a3A6BEfoeeRGJywEh',
        category: 'DeFi',
    },
    {
        name: 'Swop',
        symbol: 'SWOP',
        address: 'GAehkgN1ZDNvavX81FmzCcwRnzekKMkSyUNq8WkMsjX1',
        category: 'DeFi',
    },
    {
        name: 'Neon EVM Token',
        symbol: 'NEON',
        address: 'NeonTjSjsuo3rexg9o6vHuMXw62f9V7zvmu8M8Zut44',
        category: 'Infra',
    },
    {
        name: 'Lifinity',
        symbol: 'LFNTY',
        address: 'LFNTYraetVioAPnGJht4yNg2aUZFXR776cMeN9VMjXp',
        category: 'DeFi',
    },
    {
        name: 'GMT',
        symbol: 'GMT',
        address: '7i5KKsX2weiTkry7jA4ZwSuXGhs5eJBEjY8vVxR4pfRx',
        category: 'DeFi',
    },
    {
        name: 'Bonfida',
        symbol: 'FIDA',
        address: 'EchesyfXePKdLtoiZSL8pBe8Myagyy8ZRqsACNCFGnvp',
        category: 'Infra',
    },
    {
        name: 'Helius Staked SOL',
        symbol: 'hSOL',
        address: 'he1iusmfkpAdwvxLNGV8Y1iSbj4rUy6yMhEA3fotn9A',
        category: 'DeFi',
    },
    {
        name: 'EURC',
        symbol: 'EURC',
        address: 'HzwqbKZw8HxMN6bF2yFZNrht3c2iXXzpKcFu7uBEDKtr',
        category: 'Stablecoin',
    },
    {
        name: 'catwifhat',
        symbol: '$CWIF',
        address: '7atgF8KQo4wJrD5ATGX7t1V2zVvykPJbFfNeVf1icFv1',
        category: 'Meme',
    },
    {
        name: 'MAPS',
        symbol: 'MAPS',
        address: 'MAPS41MDahZ9QdKXhVa4dWB9RuyfV4XqhyAZ8XcYepb',
        category: 'Infra',
    },
    {
        name: 'Syrup USDC',
        symbol: 'syrupUSDC',
        address: 'AvZZF1YaZDziPY2RCK4oJrRVrbN3mTD9NL24hPeaZeUj',
        category: 'DeFi',
    },
    {
        name: 'Otterhome',
        symbol: 'HOME',
        address: 'J3umBWqhSjd13sag1E1aUojViWvPYA5dFNyqpKuX3WXj',
        category: 'Meme',
    },
    {
        name: 'Hosico cat',
        symbol: 'Hosico',
        address: '9wK8yN6iz1ie5kEJkvZCTxyN1x5sTdNfx8yeMY8Ebonk',
        category: 'Meme',
    },
    {
        name: 'BCGame Coin',
        symbol: 'BC',
        address: 'BCNT4t3rv5Hva8RnUtJUJLnxzeFAabcYp8CghC1SmWin',
        category: 'Gaming',
    },
    {
        name: 'test griffain.com',
        symbol: 'GRIFFAIN',
        address: 'KENJSUYLASHUMfHyy5o4Hp2FdNqZg1AsUPhfH2kYvEP',
        category: 'Infra',
    },
    {
        name: 'EnKryptedAI',
        symbol: 'KRAI',
        address: 'Kruj63Qx9EQX9QzukLCBgx5g9AGW69gPDsSK25FRZAi',
        category: 'AI',
    },
    {
        name: 'FWOG',
        symbol: 'FWOG',
        address: 'A8C3xuqscfmyLrte3VmTqrAq8kgMASius9AFNANwpump',
        category: 'Meme',
    },
    {
        name: 'picoSOL',
        symbol: 'picoSOL',
        address: 'picobAEvs6w7QEknPce34wAE4gknZA9v5tTonnmHYdX',
        category: 'DeFi',
    },
    {
        name: 'Act I : The AI Prophecy',
        symbol: 'ACT',
        address: 'GJAFwWjJ3vnTsrQVabjBVK2TYB1YtRCQXRDfDgUnpump',
        category: 'AI',
    },
    {
        name: 'Wrapped Bitcoin (Sollet)',
        symbol: 'BTC',
        address: '9n4nbM75f5Ui33ZbPYXn59EwSgE8CGsHtAeTH5YFeJ9E',
        category: 'DeFi',
    },
    {
        name: 'BRZ',
        symbol: 'BRZ',
        address: 'FtgGSFADXBtroxq8VCausXRr2of47QBf5AS1NtZCu4GD',
        category: 'Stablecoin',
    },
    {
        name: 'Star Atlas',
        symbol: 'ATLAS',
        address: 'ATLASXmbPQxBUYbxPsV97usA3fPQYEqzQBUHgiFCUsXx',
        category: 'Gaming',
    },
    {
        name: 'AI Rig Complex',
        symbol: 'arc',
        address: '61V8vBaqAGMpgDQi4JcAwo1dmBGHsyhzodcPqnEVpump',
        category: 'AI',
    },
    {
        name: 'zerebro',
        symbol: 'ZEREBRO',
        address: '8x5VqbHA8D7NkD52uNuS5nnt3PwA8pLD34ymskeSo2Wn',
        category: 'AI',
    },
    {
        name: 'swarms',
        symbol: 'swarms',
        address: '74SBV4zDXxTRgv1pEMoECskKBkZHc2yGPnc7GYVepump',
        category: 'AI',
    },
    {
        name: 'MAGIC INTERNET MONEY (Bitcoin)',
        symbol: 'MIM',
        address: 'M1M6sdffCs3ozzhpRveweRCWdZhxth4mvVujPtYEC3h',
        category: 'Meme',
    },
    {
        name: 'Bertram The Pomeranian',
        symbol: 'Bert',
        address: 'HgBRWfYxEfvPhtqkaeymCQtHCrKE46qQ43pKe8HCpump',
        category: 'Meme',
    },
    {
        name: 'Cogent SOL',
        symbol: 'cgntSOL',
        address: 'CgnTSoL3DgY9SFHxcLj6CgCgKKoTBr6tp4CPAEWy25DE',
        category: 'DeFi',
    },
    {
        name: 'Bitget Staked SOL',
        symbol: 'BGSOL',
        address: 'bgSoLfRx1wRPehwC9TyG568AGjnf1sQG1MYa8s3FbfY',
        category: 'DeFi',
    },
    {
        name: 'Blockasset',
        symbol: 'BLOCK',
        address: 'NFTUkR4u7wKxy9QLaX2TGvd9oZSWoMo4jqSJqdMb7Nk',
        category: 'DeFi',
    },
    {
        name: 'Liquid Staking Token',
        symbol: 'LST',
        address: 'LSTxxxnJzKDFSLr4dUkPcmCf5VyryEqzPLz5j4bpxFp',
        category: 'DeFi',
    },
    {
        name: 'Qkacoin',
        symbol: 'QKA',
        address: 'mtQ5jWgCqrgBiSut29b4HV19RkMBGA6vidwTMqhNmyy',
        category: 'Meme',
    },
    {
        name: 'Laine Stake Token',
        symbol: 'laineSOL',
        address: 'LAinEtNLgpmCP9Rvsf5Hn8W6EhNiKLZQti1xfWMLy6X',
        category: 'DeFi',
    },
    {
        name: 'Wen',
        symbol: 'WEN',
        address: 'WENWENvqqNya429ubCdR81ZmD69brwQaaBYY6p3LCpk',
        category: 'Meme',
    },
    {
        name: 'TROLL',
        symbol: 'TROLL',
        address: '5UUH9RTDiSpq6HKS6bp4NdU9PNJpXRXuiw6ShBTBhgH2',
        category: 'Meme',
    },
    {
        name: 'Nodecoin',
        symbol: 'NC',
        address: 'B89Hd5Juz7JP2dxCZXFJWk4tMTcbw7feDhuWGb3kq5qE',
        category: 'DePIN',
    },
    {
        name: 'BlackRock USD Institutional Digital Liquidity Fund',
        symbol: 'BUIDL',
        address: 'GyWgeqpy5GueU2YbkE8xqUeVEokCMMCEeUrfbtMw6phr',
        category: 'DeFi',
    },
    {
        name: 'AGENDA 47',
        symbol: 'A47',
        address: 'CN162nCPpq3DxPCyKLbAvEJeB1aCxsnVTEG4ZU8vpump',
        category: 'Meme',
    },
    {
        name: 'Chintai',
        symbol: 'CHEX',
        address: '6dKCoWjpj5MFU5gWDEFdpUUeBasBLK3wLEwhUzQPAa1e',
        category: 'Infra',
    },
    {
        name: 'Dupe',
        symbol: 'DUPE',
        address: 'fRfKGCriduzDwSudCwpL7ySCEiboNuryhZDVJtr1a1C',
        category: 'Meme',
    },
    {
        name: 'Pippin',
        symbol: 'pippin',
        address: 'Dfh5DzRgSvvCFDoYc2ciTkMrbDfRKybA4SoFbPmApump',
        category: 'Meme',
    },
    {
        name: 'RETARDIO',
        symbol: 'RETARDIO',
        address: '6ogzHhzdrQr9Pgv6hZ2MNze7UrzBMAFyBBWUYp1Fhitx',
        category: 'Meme',
    },
    {
        name: 'Yala stablecoin',
        symbol: 'YU',
        address: 'YUYAiJo8KVbnc6Fb6h3MnH2VGND4uGWDH4iLnw7DLEu',
        category: 'Stablecoin',
    },
    {
        name: 'michi',
        symbol: '$michi',
        address: '5mbK36SZ7J19An8jFochhQS4of8g6BwUjbeCSxBSoWdp',
        category: 'Meme',
    },
    {
        name: 'VNX',
        symbol: 'VNX',
        address: 'Ee4ooSk6GMC34T1Gbh8rRY2XLyuk2FsyiWtq3jrHUcPR',
        category: 'Infra',
    },
    {
        name: 'Bongo Cat',
        symbol: 'BONGO',
        address: 'HUdqc5MR5h3FssESabPnQ1GTgTcPvnNudAuLj5J6a9sU',
        category: 'Meme',
    },
    {
        name: 'Assisterr AI',
        symbol: 'ASRR',
        address: 'ASRRjA1R4RHVk5H9QKKm1jaQqMkxvv6nh5EypPrvwmxQ',
        category: 'AI',
    },
    {
        name: 'Hyperpigmentation',
        symbol: 'HYPER',
        address: 'Aq8Gocyvyyi8xk5EYxd6viUfVmVvs9T9R6mZFzZFpump',
        category: 'Meme',
    },
    {
        name: 'Epics Token',
        symbol: 'EPCT',
        address: 'CvB1ztJvpYQPvdPBePtRzjL4aQidjydtUz61NWgcgQtP',
        category: 'Infra',
    },
    {
        name: 'titcoin',
        symbol: 'titcoin',
        address: 'FtUEW73K6vEYHfbkfpdBZfWpxgQar2HipGdbutEhpump',
        category: 'Meme',
    },
    {
        name: 'VanEck Treasury Fund',
        symbol: 'VBILL',
        address: '34mJztT9am2jybSukvjNqRjgJBZqHJsHnivArx1P4xy1',
        category: 'DeFi',
    },
    {
        name: 'Send',
        symbol: 'SEND',
        address: 'SENDdRQtYMWaQrBroBrJ2Q53fgVuq95CV9UPGEvpCxa',
        category: 'NFT',
    },
    {
        name: 'HeyAnon',
        symbol: 'Anon',
        address: '9McvH6w97oewLmPxqQEoHUAv3u5iYMyQ9AeZZhguYf1T',
        category: 'Infra',
    },
    {
        name: 'Stronghold LST',
        symbol: 'strongSOL',
        address: 'strng7mqqc1MBJJV6vMzYbEqnwVGvKKGKedeCvtktWA',
        category: 'DeFi',
    },
    {
        name: 'Carrot',
        symbol: 'CRT',
        address: 'CRTx1JouZhzSU6XytsE42UQraoGqiHgxabocVfARTy2s',
        category: 'DeFi',
    },
    {
        name: 'Coral Protocol',
        symbol: 'CORAL',
        address: 'CoRAitPvr9seu5F9Hk39vbjqA1o1XuoryHjSk1Z1q2mo',
        category: 'AI',
    },
    {
        name: 'bonkSOL',
        symbol: 'bonkSOL',
        address: 'BonK1YhkXEGLZzwtcvRTip3gAL9nCeQD7ppZBLXhtTs',
        category: 'DeFi',
    },
    {
        name: 'LOCK IN',
        symbol: 'LOCKIN',
        address: '8Ki8DpuWNxu9VsS3kQbarsCWMcFGWkzzA8pUPto9zBd5',
        category: 'Meme',
    },
    {
        name: 'Wrapped FTT (Sollet)',
        symbol: 'FTT',
        address: 'AGFEad2et2ZJif9jaGpdMixQqvW5i81aBdvKe7PHNfz3',
        category: 'DeFi',
    },
    {
        name: 'USDe',
        symbol: 'USDe',
        address: 'DEkqHyPN7GMRJ5cArtQFAWefqbZb33Hyf6s5iCwjEonT',
        category: 'Stablecoin',
    },
    {
        name: 'BILLION•DOLLAR•CAT',
        symbol: 'BDC',
        address: 'BDCs2xEqzXyRpp9P6uPDnAvERpLKBfzHPEzbe3BfCxDY',
        category: 'Meme',
    },
    {
        name: 'Zenrock',
        symbol: 'ROCK',
        address: '5VsPJ2EG7jjo3k2LPzQVriENKKQkNUTzujEzuaj4Aisf',
        category: 'Infra',
    },
    {
        name: 'SolanaHub staked SOL',
        symbol: 'hubSOL',
        address: 'HUBsveNpjo5pWqNkH57QzxjQASdTVXcSK7bVKTSZtcSX',
        category: 'DeFi',
    },
    {
        name: 'SAG3.ai by VIRTUALS',
        symbol: 'SAG3',
        address: 'Gx5dX1pM5aCQn8wtXEmEHSUia3W57Jq7qdu7kKsHvirt',
        category: 'AI',
    },
    {
        name: 'UPROCK',
        symbol: 'UPT',
        address: 'UPTx1d24aBWuRgwxVnFmX4gNraj3QGFzL3QqBgxtWQG',
        category: 'AI',
    },
    {
        name: 'Wolf',
        symbol: 'WOLF',
        address: 'BTr5SwWSKPBrdUzboi2SVr1QvSjmh1caCYUkxsxLpump',
        category: 'Meme',
    },
    {
        name: 'DEGOD',
        symbol: 'DEGOD',
        address: 'degod39zqQWzpG6h4b7SJLLTCFE6FeZnZD8BwHBFxaN',
        category: 'NFT',
    },
    {
        name: 'Allbridge',
        symbol: 'ABR',
        address: 'a11bdAAuV8iB2fu7X6AxAvDTo1QZ8FXB3kk5eecdasp',
        category: 'Infra',
    },
    {
        name: 'Adrena Governance Token',
        symbol: 'ADX',
        address: 'AuQaustGiaqxRvj2gtCdrd22PBzTn8kM3kEPEkZCtuDw',
        category: 'DeFi',
    },
    {
        name: 'tBTC v2',
        symbol: 'tBTC',
        address: '6DNSN2BJsaPFdFFc1zP37kkeNe4Usc1Sqkzr9C9vPWcU',
        category: 'DeFi',
    },
    {
        name: 'XBorg',
        symbol: 'XBG',
        address: 'XBGdqJ9P175hCC1LangCEyXWNeCPHaKWA17tymz2PrY',
        category: 'DeFi',
    },
    {
        name: 'Distribute.ai',
        symbol: 'DIS',
        address: '2AEU9yWk3dEGnVwRaKv4div5TarC4dn7axFLyz6zG4Pf',
        category: 'AI',
    },
    {
        name: 'Mintify',
        symbol: 'MINT',
        address: 'AvoecWraqX969kfXUF5XCCDz59sjRjiDa1KUDyj225t8',
        category: 'DeFi',
    },
    {
        name: 'Hello Token',
        symbol: 'HELLO',
        address: '4h49hPGphLNJNDRyiBwzvKoasR3rw1WJCEv19PhUbSS4',
        category: 'Meme',
    },
    {
        name: 'Penguin',
        symbol: 'PEN',
        address: 'pen2WzojYAFUaWJn13c3UH2hXDZ5dCzu26U1xfaRx1b',
        category: 'Meme',
    },
    {
        name: 'Veterans for the Cause',
        symbol: 'VETS',
        address: 'cPZp4Sk44ecqkwVtED3YPPudQMEe5MbZsavDiwBntAU',
        category: 'Other',
    },
    {
        name: 'just buy $1 worth of this coin',
        symbol: '$1',
        address: 'GHichsGq8aPnqJyz6Jp1ASTK4PNLpB5KrD6XrfDjpump',
        category: 'Meme',
    },
    {
        name: 'Infinite Money Glitch',
        symbol: 'IMG',
        address: 'znv3FZt2HFAvzYf5LxzVyryh3mBXWuTRRng25gEZAjh',
        category: 'Meme',
    },
    {
        name: 'Dolan Duck',
        symbol: 'DOLAN',
        address: '4YK1njyeCkBuXG6phNtidJWKCbBhB659iwGkUJx98P5Z',
        category: 'Meme',
    },
    {
        name: 'Genopets',
        symbol: 'GENE',
        address: 'GENEtH5amGSi8kHAtQoezp1XEXwZJ8vcuePYnXdKrMYz',
        category: 'Gaming',
    },
    {
        name: 'Jesus Coin',
        symbol: 'JESUS',
        address: 'FQddEUoqKPnAsc4UTkAdAUV3LnCXoZEJMazguC1N11kC',
        category: 'Meme',
    },
    {
        name: 'stabble',
        symbol: 'STB',
        address: 'STBuyENwJ1GP4yNZCjwavn92wYLEY3t5S1kVS5kwyS1',
        category: 'DeFi',
    },
    {
        name: 'Worldwide USD',
        symbol: 'WUSD',
        address: 'EczfGov7Mia54FLP6Stz3kttWsUA2fv4vtDTKLuyAPDN',
        category: 'Stablecoin',
    },
    {
        name: 'Edenlayer',
        symbol: 'EDEN',
        address: '5sbZ3E6x84GXtWmBG2vX5pCTLuvCPiwn5C2Yrs3eden',
        category: 'AI',
    },
    {
        name: 'ProStaking SOL',
        symbol: 'proSOL',
        address: 'jucy5XJ76pHVvtPZb5TKRcGQExkwit2P5s4vY8UzmpC',
        category: 'DeFi',
    },
    {
        name: 'PUPS',
        symbol: 'PUPS',
        address: '2oGLxYuNBJRcepT1mEV6KnETaLD7Bf6qq3CM6skasBfe',
        category: 'Meme',
    },
    {
        name: 'PWEASE',
        symbol: 'pwease',
        address: 'CniPCE4b3s8gSUPhUiyMjXnytrEqUrMfSsnbBjLCpump',
        category: 'Meme',
    },
    {
        name: 'Orbitt Token',
        symbol: 'ORBT',
        address: 'BGyjasmSzYM9hHiZ1LBU4EJ7KCtRjMSpbN4zTru3W5vf',
        category: 'Meme',
    },
    {
        name: 'Luna by Virtuals (Wormhole)',
        symbol: 'LUNA',
        address: '9se6kma7LeGcQWyRBNcYzyxZPE3r9t9qWZ8SnjnN3jJ7',
        category: 'AI',
    },
    {
        name: 'Blaze',
        symbol: 'BLZE',
        address: 'BLZEEuZUBVqFhj8adcCFPJvPVCiCyVmh3hkJMrU8KuJA',
        category: 'DeFi',
    },
    {
        name: 'Kori The Pom',
        symbol: 'KORI',
        address: 'HtTYHz1Kf3rrQo6AqDLmss7gq5WrkWAaXn3tupUZbonk',
        category: 'Meme',
    },
    {
        name: 'Synatra Staked USDC',
        symbol: 'yUSD',
        address: 'yUSDX7W89jXWn4zzDPLnhykDymSjQSmpaJ8e4fjC1fg',
        category: 'Stablecoin',
    },
    {
        name: 'HDOKI',
        symbol: 'OKI',
        address: 'GJQpf6Zjvokd3YK5EprXqZUah9jxkn8aG4pTeWL7Gkju',
        category: 'Other',
    },
    {
        name: 'pepeinatux',
        symbol: '$INA',
        address: '2yd2Suus3YY4Sa7LHhn1PSHkjXj3XKrars4cCog2tGU8',
        category: 'Meme',
    },
    {
        name: 'SwissBorg Token',
        symbol: 'BORG',
        address: '3dQTr7ror2QPKQ3GbBCokJUmjErGg8kTJzdnYjNfvi3Z',
        category: 'Infra',
    },
    {
        name: 'Chudjak',
        symbol: 'Chud',
        address: '6yjNqPzTSanBWSa6dxVEgTjePXBrZ2FoHLDQwYwEsyM6',
        category: 'Meme',
    },
    {
        name: 'basis',
        symbol: 'BASIS',
        address: 'Basis9oJw9j8cw53oMV7iqsgo6ihi9ALw4QR31rcjUJa',
        category: 'AI',
    },
    {
        name: 'READY!',
        symbol: 'READY',
        address: 'HKJHsYJHMVK5VRyHHk5GhvzY9tBAAtPvDkZfDH6RLDTd',
        category: 'Meme',
    },
]


interface Token {
    name: string
    symbol: string
    address: string
    category: string
}
const tokensMap = new Map<string, Token>(tokens.map((token) => [token.address, token]))
