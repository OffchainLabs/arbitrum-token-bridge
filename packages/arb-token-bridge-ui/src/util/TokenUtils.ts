import { BigNumber, constants } from 'ethers'
import { Chain } from 'wagmi'
import { Provider } from '@ethersproject/providers'
import { Erc20Bridger, MultiCaller } from '@arbitrum/sdk'
import { StandardArbERC20__factory } from '@arbitrum/sdk/dist/lib/abi/factories/StandardArbERC20__factory'
import { ERC20__factory } from '@arbitrum/sdk/dist/lib/abi/factories/ERC20__factory'
import { L1TokenData, L2TokenData } from '../hooks/arbTokenBridge.types'
import { CommonAddress } from './CommonAddressUtils'
import { isNetwork } from './networks'

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

/**
 * Retrieves the L1 address of an ERC-20 token using its L2 address.
 * @param erc20L2Address
 * @param l2Provider
 * @returns
 */
export async function getL1ERC20Address({
  erc20L2Address,
  l2Provider
}: {
  erc20L2Address: string
  l2Provider: Provider
}): Promise<string | null> {
  try {
    const erc20Bridger = await Erc20Bridger.fromProvider(l2Provider)
    return await erc20Bridger.getL1ERC20Address(erc20L2Address, l2Provider)
  } catch (error) {
    return null
  }
}

/*
 Retrieves the L2 gateway of an ERC-20 token using its L1 address.
*/
export async function getL2GatewayAddress({
  erc20L1Address,
  l2Provider
}: {
  erc20L1Address: string
  l2Provider: Provider
}): Promise<string> {
  const erc20Bridger = await Erc20Bridger.fromProvider(l2Provider)
  return erc20Bridger.getL2GatewayAddress(erc20L1Address, l2Provider)
}

/*
 Retrieves the L2 address of an ERC-20 token using its L1 address.
*/
export async function getL2ERC20Address({
  erc20L1Address,
  l1Provider,
  l2Provider
}: {
  erc20L1Address: string
  l1Provider: Provider
  l2Provider: Provider
}): Promise<string> {
  const erc20Bridger = await Erc20Bridger.fromProvider(l2Provider)
  return await erc20Bridger.getL2ERC20Address(erc20L1Address, l1Provider)
}

/*
 Retrieves data about whether an ERC-20 token is disabled on the router.
 */
export async function l1TokenIsDisabled({
  erc20L1Address,
  l1Provider,
  l2Provider
}: {
  erc20L1Address: string
  l1Provider: Provider
  l2Provider: Provider
}): Promise<boolean> {
  const erc20Bridger = await Erc20Bridger.fromProvider(l2Provider)
  return erc20Bridger.l1TokenIsDisabled(erc20L1Address, l1Provider)
}

type SanitizeTokenOptions = {
  erc20L1Address?: string | null // token address on L1
  chain: Chain // chain for which we want to retrieve the token name / symbol
}

// get the exact token symbol for a particular chain
export function sanitizeTokenSymbol(
  tokenSymbol: string,
  options?: SanitizeTokenOptions
) {
  if (typeof options === 'undefined') {
    return tokenSymbol.toUpperCase()
  }

  const isArbitrumOne = isNetwork(options.chain.id).isArbitrumOne

  // only special case for USDC is Arbitrum One
  if (options.erc20L1Address === CommonAddress.Mainnet.USDC && isArbitrumOne) {
    return 'USDC.e'
  }

  return tokenSymbol.toUpperCase()
}

// get the exact token name for a particular chain
export function sanitizeTokenName(
  tokenName: string,
  options?: SanitizeTokenOptions
) {
  if (typeof options === 'undefined') {
    return tokenName
  }

  const isArbitrumOne = isNetwork(options.chain.id).isArbitrumOne

  // only special case for USDC is Arbitrum One
  if (options.erc20L1Address === CommonAddress.Mainnet.USDC && isArbitrumOne) {
    return 'Bridged USDC'
  }

  return tokenName
}
