import { useCallback } from 'react'
import useSWR, { KeyedMutator } from 'swr'
import { ethers } from 'ethers'
import { StaticJsonRpcProvider } from '@ethersproject/providers'
import { computePoolAddress, FeeAmount } from '@uniswap/v3-sdk'
import { Token } from '@uniswap/sdk-core'
import IUniswapV3PoolABI from '@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json'
import Quoter from '@uniswap/v3-periphery/artifacts/contracts/lens/Quoter.sol/Quoter.json'
import { ChainId, rpcURLs } from '../util/networks'

export type UseETHPriceResult = {
  ethPrice: number
  ethToUSD: (etherValue: number) => number
  error?: Error
  isValidating: boolean
  mutate: KeyedMutator<any>
}

export const POOL_FACTORY_CONTRACT_ADDRESS =
  '0x1F98431c8aD98523631AE4a59f267346ea31F984'
export const QUOTER_CONTRACT_ADDRESS =
  '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6'

const getEthPrice = async () => {
  const provider = new StaticJsonRpcProvider(rpcURLs[ChainId.Ethereum])

  // derive the ETH price from Uniswap pool
  // https://docs.uniswap.org/sdk/v3/guides/swaps/quoting
  // https://github.com/Uniswap/examples/blob/main/v3-sdk/quoting/src/libs/quote.ts

  const WETH_TOKEN = new Token(
    1,
    '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
    18,
    'WETH',
    'Wrapped Ether'
  )
  const USDC_TOKEN = new Token(
    1,
    '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    6,
    'USDC',
    'USD//C'
  )
  const quoteConfig = {
    in: WETH_TOKEN,
    amountIn: 1,
    out: USDC_TOKEN,
    poolFee: FeeAmount.MEDIUM
  }

  // get the pool contract for mentioned tokens on uniswap
  const currentPoolAddress = computePoolAddress({
    factoryAddress: POOL_FACTORY_CONTRACT_ADDRESS,
    tokenA: quoteConfig.in,
    tokenB: quoteConfig.out,
    fee: quoteConfig.poolFee
  })
  const poolContract = new ethers.Contract(
    currentPoolAddress,
    IUniswapV3PoolABI.abi,
    provider
  )
  const [token0, token1, fee] = await Promise.all([
    poolContract.token0(),
    poolContract.token1(),
    poolContract.fee()
  ])

  // get the quote for swapping 1 ETH for n USDT (this will be the price of ETH)
  const quoterContract = new ethers.Contract(
    QUOTER_CONTRACT_ADDRESS,
    Quoter.abi,
    provider
  )
  const quotedAmountOut: number =
    await quoterContract?.callStatic?.quoteExactInputSingle?.(
      token1,
      token0,
      fee,
      ethers.utils
        .parseUnits(quoteConfig.amountIn.toString(), quoteConfig.in.decimals)
        .toString(),
      0
    )
  const ethPrice = ethers.utils.formatUnits(
    quotedAmountOut,
    quoteConfig.out.decimals
  )

  return Number(ethPrice)
}

export function useETHPrice(): UseETHPriceResult {
  const { data, error, isValidating, mutate } = useSWR<number, Error>(
    'eth/usd',
    () => getEthPrice(),
    {
      refreshInterval: 30_000,
      shouldRetryOnError: true,
      errorRetryCount: 2,
      errorRetryInterval: 3_000
    }
  )

  const ethToUSD = useCallback(
    (etherValue: number) => {
      const safeETHPrice = typeof data === 'number' ? data : 0
      return etherValue * safeETHPrice
    },
    [data]
  )

  return { ethPrice: data ?? 0, ethToUSD, error, isValidating, mutate }
}
