import Ajv from 'ajv'
import addFormats from 'ajv-formats'
import { schema, TokenList } from '@uniswap/token-lists'
import { BigNumber, constants } from 'ethers'
import { Provider } from '@ethersproject/providers'
import { Erc20Bridger, MultiCaller } from '@arbitrum/sdk'
import { StandardArbERC20__factory } from '@arbitrum/sdk/dist/lib/abi/factories/StandardArbERC20__factory'
import { ERC20__factory } from '@arbitrum/sdk/dist/lib/abi/factories/ERC20__factory'
import { L1TokenData, L2TokenData } from '../token-bridge-sdk/index'

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

type TokenDataCache = { [erc20L1Address: string]: L1TokenData }

// Get the token data cache (only name, symbol, decimals keys stored)
const getTokenDataCache = () => {
  const cache: TokenDataCache = JSON.parse(
    sessionStorage.getItem('l1TokenDataCache') || '{}'
  )
  return cache
}

// Set the token data cache (only name, symbol, decimals)
const setTokenDataCache = (erc20L1Address: string, tokenData: L1TokenData) => {
  const l1TokenDataCache = getTokenDataCache()
  l1TokenDataCache[erc20L1Address] = tokenData

  sessionStorage.setItem('l1TokenDataCache', JSON.stringify(l1TokenDataCache))
}

/**
 * Retrieves static data (name, decimals, symbol, address) about an ERC-20 token using its L1 address
 * @param erc20L1Address,
 * @param l1Provider
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
  // checking the cache for tokens results
  // if successfully found in the cache, return the token data
  const l1TokenDataCache = getTokenDataCache()
  const cachedTokenData = l1TokenDataCache[erc20L1Address]
  if (cachedTokenData) return cachedTokenData

  // else, call on-chain method to retrieve token data
  const contract = ERC20__factory.connect(erc20L1Address, l1Provider)
  const erc20Bridger = await Erc20Bridger.fromProvider(l2Provider)
  const l1GatewayAddress = await erc20Bridger.getL1GatewayAddress(
    erc20L1Address,
    l1Provider
  )
  const multiCaller = await MultiCaller.fromProvider(l1Provider)
  const [tokenData] = await multiCaller.getTokenData([erc20L1Address], {
    decimals: true,
    name: true,
    symbol: true,
    allowance: { owner: account, spender: l1GatewayAddress } // getting allowance will help us know if it's a valid ERC20 token
  })

  if (tokenData && typeof tokenData.allowance === 'undefined') {
    if (throwOnInvalidERC20)
      throw new Error(
        `getL1TokenData: No allowance method available for ${erc20L1Address}`
      )
  }

  const finalTokenData = {
    name: tokenData?.name ?? getDefaultTokenName(erc20L1Address),
    symbol: tokenData?.symbol ?? getDefaultTokenSymbol(erc20L1Address),
    decimals: tokenData?.decimals ?? 0,
    address: contract.address
  }

  // store the newly fetched final-token-data in cache
  try {
    setTokenDataCache(erc20L1Address, finalTokenData)
  } catch (e) {
    console.warn(e)
  }

  return finalTokenData
}

/**
 * Retrieves token allowance of an ERC-20 token using its L1 address.
 * @param account,
 * @param erc20L1Address,
 * @param l1Provider,
 * @param l2Provider,
 */
export async function getL1TokenAllowance({
  account,
  erc20L1Address,
  l1Provider,
  l2Provider
}: {
  account: string
  erc20L1Address: string
  l1Provider: Provider
  l2Provider: Provider
}): Promise<BigNumber> {
  const erc20Bridger = await Erc20Bridger.fromProvider(l2Provider)

  const l1GatewayAddress = await erc20Bridger.getL1GatewayAddress(
    erc20L1Address,
    l1Provider
  )
  const multiCaller = await MultiCaller.fromProvider(l1Provider)
  const [tokenData] = await multiCaller.getTokenData([erc20L1Address], {
    allowance: { owner: account, spender: l1GatewayAddress }
  })

  return tokenData?.allowance ?? constants.Zero
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
