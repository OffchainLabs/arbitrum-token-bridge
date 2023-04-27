import Ajv from 'ajv'
import addFormats from 'ajv-formats'
import { schema, TokenList } from '@uniswap/token-lists'
import { constants } from 'ethers'
import { Provider } from '@ethersproject/providers'
import { Erc20Bridger, MultiCaller } from '@arbitrum/sdk'
import { StandardArbERC20__factory } from '@arbitrum/sdk/dist/lib/abi/factories/StandardArbERC20__factory'
import { EventArgs } from '@arbitrum/sdk/dist/lib/dataEntities/event'
import { L2ToL1TransactionEvent } from '@arbitrum/sdk/dist/lib/message/L2ToL1Message'
import { L2ToL1TransactionEvent as ClassicL2ToL1TransactionEvent } from '@arbitrum/sdk/dist/lib/abi/ArbSys'
import { ERC20__factory, L1TokenData, L2TokenData } from '../index'

export function assertNever(x: never, message = 'Unexpected object'): never {
  console.error(message, x)
  throw new Error('see console ' + message)
}

export const validateTokenList = (tokenList: TokenList) => {
  const ajv = new Ajv()
  addFormats(ajv)
  const validate = ajv.compile(schema)

  return validate(tokenList)
}

export function getDefaultTokenName(address: string) {
  const lowercased = address.toLowerCase()
  return (
    lowercased.substring(0, 5) +
    '...' +
    lowercased.substring(lowercased.length - 3)
  )
}

export function getDefaultTokenSymbol(address: string) {
  const lowercased = address.toLowerCase()
  return (
    lowercased.substring(0, 5) +
    '...' +
    lowercased.substring(lowercased.length - 3)
  )
}

type StaticTokenData = Pick<L1TokenData, 'name' | 'symbol' | 'decimals'>

type TokenDataCache = {
  [account: string]: { [erc20L1Address: string]: StaticTokenData }
}

// Get the token data cache for any account
const getTokenDataCache = (account: string) => {
  const cache: TokenDataCache = JSON.parse(
    sessionStorage.getItem('l1TokenDataCache') || '{}'
  )
  return cache[account] || {}
}

// Set the token data cache for current account
const setTokenDataCache = (
  account: string,
  erc20L1Address: string,
  tokenData: StaticTokenData
) => {
  const cache: TokenDataCache = JSON.parse(
    sessionStorage.getItem('l1TokenDataCache') || '{}'
  )
  const l1TokenDataCache = getTokenDataCache(account)
  l1TokenDataCache[erc20L1Address] = tokenData

  sessionStorage.setItem(
    'l1TokenDataCache',
    JSON.stringify({ ...cache, [account]: l1TokenDataCache })
  )
}

/**
 * Retrieves data about an ERC-20 token using its L1 address. Throws if fails to retrieve balance or allowance.
 * @param account,
 * @param erc20L1Address,
 * @param l1Provider,
 * @param l2Provider,
 * @param throwOnInvalidERC20
 */
export async function getL1TokenData({
  account,
  erc20L1Address,
  l1Provider,
  l2Provider,
  throwOnInvalidERC20 = true
}: {
  account: string
  erc20L1Address: string
  l1Provider: Provider
  l2Provider: Provider
  throwOnInvalidERC20?: boolean
}): Promise<L1TokenData> {
  const erc20Bridger = await Erc20Bridger.fromProvider(l2Provider)

  const l1GatewayAddress = await erc20Bridger.getL1GatewayAddress(
    erc20L1Address,
    l1Provider
  )

  const contract = ERC20__factory.connect(erc20L1Address, l1Provider)

  const multiCaller = await MultiCaller.fromProvider(l1Provider)
  const [tokenData] = await multiCaller.getTokenData([erc20L1Address], {
    balanceOf: { account },
    allowance: { owner: account, spender: l1GatewayAddress },
    decimals: true,
    name: true,
    symbol: true
  })

  let shouldCache = true

  if (tokenData && typeof tokenData.balance === 'undefined') {
    shouldCache = false

    if (throwOnInvalidERC20)
      throw new Error(
        `getL1TokenData: No balance method available for ${erc20L1Address}`
      )
  }

  if (tokenData && typeof tokenData.allowance === 'undefined') {
    shouldCache = false

    if (throwOnInvalidERC20)
      throw new Error(
        `getL1TokenData: No allowance method available for ${erc20L1Address}`
      )
  }

  const finalTokenData = {
    name: tokenData?.name ?? getDefaultTokenName(erc20L1Address),
    symbol: tokenData?.symbol ?? getDefaultTokenSymbol(erc20L1Address),
    balance: tokenData?.balance ?? constants.Zero,
    allowance: tokenData?.allowance ?? constants.Zero,
    decimals: tokenData?.decimals ?? 0,
    contract
  }

  // store the newly fetched final-token-data in cache
  try {
    // only cache the token data if there were no errors in fetching it
    if (shouldCache) {
      setTokenDataCache(account, erc20L1Address, {
        name: finalTokenData.name,
        symbol: finalTokenData.symbol,
        decimals: finalTokenData.decimals
      })
    }
  } catch (e) {
    console.warn(e)
  }

  return finalTokenData
}

/**
 * Retrieves cached data about an ERC-20 token using its L1 address.
 * @param account,
 * @param erc20L1Address,
 * @param l1Provider,
 * @param l2Provider,
 * @param throwOnInvalidERC20
 */
export async function getCachedL1TokenData({
  account,
  erc20L1Address,
  l1Provider,
  l2Provider,
  throwOnInvalidERC20 = true
}: {
  account: string
  erc20L1Address: string
  l1Provider: Provider
  l2Provider: Provider
  throwOnInvalidERC20?: boolean
}): Promise<StaticTokenData> {
  // caching for tokens results
  const l1TokenDataCache = getTokenDataCache(account)
  const cachedTokenData = l1TokenDataCache?.[erc20L1Address]
  // successfully found the cache for the required token
  if (cachedTokenData) return cachedTokenData

  // else fetch and return the live token data (it will cache it as well)
  const { name, symbol, decimals } = await getL1TokenData({
    account,
    erc20L1Address,
    l1Provider,
    l2Provider,
    throwOnInvalidERC20
  })

  return { name, symbol, decimals }
}

/**
 * Retrieves data about an ERC-20 token using its L2 address. Throws if fails to retrieve balance.
 * @param erc20L2Address
 * @returns
 */
export async function getL2TokenData({
  account,
  erc20L2Address,
  l2Provider
}: {
  account: string
  erc20L2Address: string
  l2Provider: Provider
}): Promise<L2TokenData> {
  const contract = StandardArbERC20__factory.connect(erc20L2Address, l2Provider)

  const multiCaller = await MultiCaller.fromProvider(l2Provider)
  const [tokenData] = await multiCaller.getTokenData([erc20L2Address], {
    balanceOf: { account }
  })

  if (tokenData && typeof tokenData.balance === 'undefined') {
    throw new Error(
      `getL2TokenData: No balance method available for ${erc20L2Address}`
    )
  }

  return {
    balance: tokenData?.balance ?? constants.Zero,
    contract
  }
}

export function isClassicL2ToL1TransactionEvent(
  event: L2ToL1TransactionEvent
): event is EventArgs<ClassicL2ToL1TransactionEvent> {
  return typeof (event as any).batchNumber !== 'undefined'
}
