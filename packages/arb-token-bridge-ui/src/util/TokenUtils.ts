import { BigNumber, constants } from 'ethers'
import { Chain } from 'wagmi'
import { Provider } from '@ethersproject/providers'
import { Erc20Bridger, MultiCaller } from '@arbitrum/sdk'
import { StandardArbERC20__factory } from '@arbitrum/sdk/dist/lib/abi/factories/StandardArbERC20__factory'
import { ERC20__factory } from '@arbitrum/sdk/dist/lib/abi/factories/ERC20__factory'

import { L1TokenData, L2TokenData } from '../hooks/arbTokenBridge.types'
import { CommonAddress } from './CommonAddressUtils'
import { isNetwork } from './networks'
import { defaultErc20Decimals } from '../defaults'

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

export type FetchErc20DataProps = {
  /**
   * Address of the ERC-20 token contract.
   * */
  address: string
  /**
   * Provider for the chain where the ERC-20 token contract is deployed.
   */
  provider: Provider
}

export async function fetchErc20Data({
  address,
  provider
}: FetchErc20DataProps) {
  const multiCaller = await MultiCaller.fromProvider(provider)

  // todo: fall back if there is no multicall?
  const [tokenData] = await multiCaller.getTokenData([address], {
    name: true,
    symbol: true,
    decimals: true
  })

  return {
    name: tokenData?.name ?? getDefaultTokenName(address),
    symbol: tokenData?.symbol ?? getDefaultTokenSymbol(address),
    decimals: tokenData?.decimals ?? defaultErc20Decimals
  }
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
    decimals: tokenData?.decimals ?? defaultErc20Decimals,
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

export type FetchErc20AllowanceParams = FetchErc20DataProps & {
  /**
   * Address of the owner of the ERC-20 tokens.
   */
  owner: string
  /**
   * Address of the spender of the ERC-20 tokens.
   */
  spender: string
}

/**
 * Fetches allowance for an ERC-20 token.
 */
export async function fetchErc20Allowance(params: FetchErc20AllowanceParams) {
  const { address, provider, owner, spender } = params

  // todo: fall back if there is no multicall?
  const multiCaller = await MultiCaller.fromProvider(provider)
  const [tokenData] = await multiCaller.getTokenData([address], {
    allowance: { owner, spender }
  })

  return tokenData?.allowance ?? constants.Zero
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

  return fetchErc20Allowance({
    address: erc20L1Address,
    provider: l1Provider,
    owner: account,
    spender: l1GatewayAddress
  })
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
 Retrieves the L1 gateway of an ERC-20 token using its L1 address.
*/
export async function getL1GatewayAddress({
  erc20L1Address,
  l1Provider,
  l2Provider
}: {
  erc20L1Address: string
  l1Provider: Provider
  l2Provider: Provider
}): Promise<string> {
  const erc20Bridger = await Erc20Bridger.fromProvider(l2Provider)
  return erc20Bridger.getL1GatewayAddress(erc20L1Address, l1Provider)
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

export const isTokenMainnetUSDC = (tokenAddress: string | undefined) =>
  tokenAddress?.toLowerCase() === CommonAddress.Mainnet.USDC.toLowerCase()

export const isTokenGoerliUSDC = (tokenAddress: string | undefined) =>
  tokenAddress?.toLowerCase() === CommonAddress.Goerli.USDC.toLowerCase()

export const isTokenArbitrumOneNativeUSDC = (
  tokenAddress: string | undefined
) =>
  tokenAddress?.toLowerCase() === CommonAddress.ArbitrumOne.USDC.toLowerCase()

export const isTokenArbitrumGoerliNativeUSDC = (
  tokenAddress: string | undefined
) =>
  tokenAddress?.toLowerCase() ===
  CommonAddress.ArbitrumGoerli.USDC.toLowerCase()

// get the exact token symbol for a particular chain
export function sanitizeTokenSymbol(
  tokenSymbol: string,
  options: SanitizeTokenOptions
) {
  if (!options.erc20L1Address) {
    return tokenSymbol
  }

  const { isArbitrumOne, isArbitrumGoerli } = isNetwork(options.chain.id)

  if (
    isTokenMainnetUSDC(options.erc20L1Address) ||
    isTokenGoerliUSDC(options.erc20L1Address)
  ) {
    // It should be `USDC` on all chains except Arbitrum One/Arbitrum Goerli
    if (isArbitrumOne || isArbitrumGoerli) return 'USDC.e'
    return 'USDC'
  }

  return tokenSymbol
}

// get the exact token name for a particular chain
export function sanitizeTokenName(
  tokenName: string,
  options: SanitizeTokenOptions
) {
  if (!options.erc20L1Address) {
    return tokenName
  }

  const { isArbitrumOne, isArbitrumGoerli } = isNetwork(options.chain.id)

  if (
    isTokenMainnetUSDC(options.erc20L1Address) ||
    isTokenGoerliUSDC(options.erc20L1Address)
  ) {
    // It should be `USD Coin` on all chains except Arbitrum One/Arbitrum Goerli
    if (isArbitrumOne || isArbitrumGoerli) return 'Bridged USDC'
    return 'USD Coin'
  }

  return tokenName
}
