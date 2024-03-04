import { constants } from 'ethers'
import { Provider } from '@ethersproject/providers'
import { Erc20Bridger, MultiCaller } from '@arbitrum/sdk'
import { ERC20__factory } from '@arbitrum/sdk/dist/lib/abi/factories/ERC20__factory'
import { L2ERC20Gateway__factory } from '@arbitrum/sdk/dist/lib/abi/factories/L2ERC20Gateway__factory'
import * as Sentry from '@sentry/react'

import { CommonAddress } from './CommonAddressUtils'
import { ChainId, isNetwork } from './networks'
import { defaultErc20Decimals } from '../defaults'
import { ERC20BridgeToken, TokenType } from '../hooks/arbTokenBridge.types'

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

export type Erc20Data = {
  name: string
  symbol: string
  decimals: number
  address: string
}

const erc20DataCacheLocalStorageKey = 'arbitrum:bridge:erc20-cache'

type Erc20DataCache = {
  [cacheKey: string]: Erc20Data
}

type GetErc20DataCacheParams = {
  chainId: number
  address: string
}

function getErc20DataCacheKey({ chainId, address }: GetErc20DataCacheParams) {
  return `${chainId}:${address}`
}

function getErc20DataCache(): Erc20DataCache
function getErc20DataCache(params: GetErc20DataCacheParams): Erc20Data | null
function getErc20DataCache(
  params?: GetErc20DataCacheParams
): Erc20DataCache | (Erc20Data | null) {
  const cache: Erc20DataCache = JSON.parse(
    // intentionally using || instead of ?? for it to work with an empty string
    localStorage.getItem(erc20DataCacheLocalStorageKey) || '{}'
  )

  if (typeof params !== 'undefined') {
    return cache[getErc20DataCacheKey(params)] ?? null
  }

  return cache
}

type SetErc20DataCacheParams = GetErc20DataCacheParams & {
  erc20Data: Erc20Data
}

function setErc20DataCache({ erc20Data, ...params }: SetErc20DataCacheParams) {
  const cache = getErc20DataCache()
  cache[getErc20DataCacheKey(params)] = erc20Data
  localStorage.setItem(erc20DataCacheLocalStorageKey, JSON.stringify(cache))
}

export type FetchErc20DataProps = {
  /**
   * Address of the ERC-20 token contract.
   */
  address: string
  /**
   * Provider for the chain where the ERC-20 token contract is deployed.
   */
  provider: Provider
}

export async function fetchErc20Data({
  address,
  provider
}: FetchErc20DataProps): Promise<Erc20Data> {
  const chainId = (await provider.getNetwork()).chainId
  const cachedErc20Data = getErc20DataCache({ chainId, address })

  if (cachedErc20Data) {
    return cachedErc20Data
  }

  try {
    const multiCaller = await MultiCaller.fromProvider(provider)
    const [tokenData] = await multiCaller.getTokenData([address], {
      name: true,
      symbol: true,
      decimals: true
    })

    const erc20Data: Erc20Data = {
      name: tokenData?.name ?? getDefaultTokenName(address),
      symbol: tokenData?.symbol ?? getDefaultTokenSymbol(address),
      decimals: tokenData?.decimals ?? defaultErc20Decimals,
      address
    }

    try {
      setErc20DataCache({ chainId, address, erc20Data })
    } catch (e) {
      console.warn('Failed to store ERC-20 data to cache.')
      console.warn(e)
    }

    return erc20Data
  } catch (error) {
    // log some extra info on sentry in case multi-caller fails
    Sentry.configureScope(function (scope) {
      scope.setExtra('token_address', address)
      Sentry.captureException(error)
    })
    throw error
  }
}

export async function isValidErc20({
  address,
  provider
}: FetchErc20DataProps): Promise<boolean> {
  const erc20 = ERC20__factory.connect(address, provider)

  try {
    await Promise.all([
      // we don't reallly care about the balance in this call, so we're just using vitalik.eth
      // didn't want to use address zero in case contracts have checks for it
      erc20.balanceOf('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'),
      erc20.totalSupply()
    ])

    return true
  } catch (err) {
    return false
  }
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
  try {
    const multiCaller = await MultiCaller.fromProvider(provider)
    const [tokenData] = await multiCaller.getTokenData([address], {
      allowance: { owner, spender }
    })
    return tokenData?.allowance ?? constants.Zero
  } catch (error) {
    // log the issue on sentry, later, fall back if there is no multicall
    Sentry.configureScope(function (scope) {
      scope.setExtra('token_address', address)
      Sentry.captureException(error)
    })
    throw error
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
export async function fetchErc20L1GatewayAddress({
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
export async function fetchErc20L2GatewayAddress({
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
  chainId: ChainId // chainId for which we want to retrieve the token name / symbol
}

export const isTokenMainnetUSDC = (tokenAddress: string | undefined) =>
  tokenAddress?.toLowerCase() === CommonAddress.Ethereum.USDC.toLowerCase()

export const isTokenArbitrumOneUSDCe = (tokenAddress: string | undefined) =>
  tokenAddress?.toLowerCase() ===
  CommonAddress.ArbitrumOne['USDC.e'].toLowerCase()

export const isTokenSepoliaUSDC = (tokenAddress: string | undefined) =>
  tokenAddress?.toLowerCase() === CommonAddress.Sepolia.USDC.toLowerCase()

export const isTokenArbitrumSepoliaUSDCe = (tokenAddress: string | undefined) =>
  tokenAddress?.toLowerCase() ===
  CommonAddress.ArbitrumSepolia['USDC.e'].toLowerCase()

export const isTokenArbitrumOneNativeUSDC = (
  tokenAddress: string | undefined | null
) =>
  tokenAddress?.toLowerCase() === CommonAddress.ArbitrumOne.USDC.toLowerCase()

export const isTokenArbitrumSepoliaNativeUSDC = (
  tokenAddress: string | undefined
) =>
  tokenAddress?.toLowerCase() ===
  CommonAddress.ArbitrumSepolia.USDC.toLowerCase()

export const isTokenNativeUSDC = (tokenAddress: string | undefined) => {
  return (
    isTokenMainnetUSDC(tokenAddress) ||
    isTokenSepoliaUSDC(tokenAddress) ||
    isTokenArbitrumOneNativeUSDC(tokenAddress) ||
    isTokenArbitrumSepoliaNativeUSDC(tokenAddress)
  )
}

// get the exact token symbol for a particular chain
export function sanitizeTokenSymbol(
  tokenSymbol: string,
  options: SanitizeTokenOptions
) {
  if (!options.erc20L1Address) {
    return tokenSymbol
  }

  const { isArbitrumOne, isArbitrumSepolia } = isNetwork(options.chainId)

  if (
    isTokenMainnetUSDC(options.erc20L1Address) ||
    isTokenArbitrumOneUSDCe(options.erc20L1Address) ||
    isTokenSepoliaUSDC(options.erc20L1Address) ||
    isTokenArbitrumSepoliaUSDCe(options.erc20L1Address)
  ) {
    // It should be `USDC` on all chains except Arbitrum One/Arbitrum Sepolia
    if (isArbitrumOne || isArbitrumSepolia) return 'USDC.e'
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

  const { isArbitrumOne, isArbitrumSepolia } = isNetwork(options.chainId)

  if (
    isTokenMainnetUSDC(options.erc20L1Address) ||
    isTokenArbitrumOneUSDCe(options.erc20L1Address) ||
    isTokenSepoliaUSDC(options.erc20L1Address) ||
    isTokenArbitrumSepoliaUSDCe(options.erc20L1Address)
  ) {
    // It should be `USD Coin` on all chains except Arbitrum One/Arbitrum Sepolia
    if (isArbitrumOne || isArbitrumSepolia) return 'Bridged USDC'
    return 'USD Coin'
  }

  return tokenName
}

export function erc20DataToErc20BridgeToken(data: Erc20Data): ERC20BridgeToken {
  return {
    name: data.name,
    type: TokenType.ERC20,
    symbol: data.symbol,
    address: data.address,
    decimals: data.decimals,
    listIds: new Set()
  }
}

export async function isGatewayRegistered({
  erc20ParentChainAddress,
  parentChainProvider,
  childChainProvider
}: {
  erc20ParentChainAddress: string
  parentChainProvider: Provider
  childChainProvider: Provider
}): Promise<boolean> {
  const erc20Bridger = await Erc20Bridger.fromProvider(childChainProvider)
  const parentChainStandardGatewayAddressFromChainConfig =
    erc20Bridger.l2Network.tokenBridge.l1ERC20Gateway.toLowerCase()

  const parentChainGatewayAddressFromParentGatewayRouter = (
    await erc20Bridger.getL1GatewayAddress(
      erc20ParentChainAddress,
      parentChainProvider
    )
  ).toLowerCase()

  // token uses standard gateway; no need to check further
  if (
    parentChainStandardGatewayAddressFromChainConfig ===
    parentChainGatewayAddressFromParentGatewayRouter
  ) {
    return true
  }

  const tokenChildChainAddressFromParentGatewayRouter = (
    await erc20Bridger.getL2ERC20Address(
      erc20ParentChainAddress,
      parentChainProvider
    )
  ).toLowerCase()

  const childChainGatewayAddressFromChildChainRouter = (
    await erc20Bridger.getL2GatewayAddress(
      erc20ParentChainAddress,
      childChainProvider
    )
  ).toLowerCase()

  const tokenChildChainAddressFromChildChainGateway = (
    await L2ERC20Gateway__factory.connect(
      childChainGatewayAddressFromChildChainRouter,
      childChainProvider
    ).calculateL2TokenAddress(erc20ParentChainAddress)
  ).toLowerCase()

  return (
    tokenChildChainAddressFromParentGatewayRouter ===
    tokenChildChainAddressFromChildChainGateway
  )
}
