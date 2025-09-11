import { constants } from 'ethers'
import { Provider } from '@ethersproject/providers'
import {
  Erc20Bridger,
  Erc20L1L3Bridger,
  EthBridger,
  EthL1L3Bridger,
  MultiCaller,
  getArbitrumNetwork
} from '@arbitrum/sdk'
import { ERC20__factory } from '@arbitrum/sdk/dist/lib/abi/factories/ERC20__factory'

import { CommonAddress } from './CommonAddressUtils'
import { isNetwork } from './networks'
import { ChainId } from '../types/ChainId'
import { defaultErc20Decimals } from '../defaults'
import { ERC20BridgeToken, TokenType } from '../hooks/arbTokenBridge.types'
import { getBridger, getChainIdFromProvider } from '../token-bridge-sdk/utils'
import {
  getL2ConfigForTeleport,
  isValidTeleportChainPair
} from '../token-bridge-sdk/teleport'
import { captureSentryErrorWithExtraData } from './SentryUtils'
import { addressesEqual } from './AddressUtils'

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
  if (
    typeof window === 'undefined' ||
    typeof window.localStorage === 'undefined'
  ) {
    return null
  }

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
    let name, symbol, decimals

    try {
      // try multicaller first
      const multiCaller = await MultiCaller.fromProvider(provider)
      const [tokenData] = await multiCaller.getTokenData([address], {
        name: true,
        symbol: true,
        decimals: true
      })

      name = tokenData?.name
      symbol = tokenData?.symbol
      decimals = tokenData?.decimals
    } catch {
      // fetch data individually if multicaller fails
      try {
        const erc20 = ERC20__factory.connect(address, provider)

        ;[name, symbol, decimals] = await Promise.all([
          erc20.name(),
          erc20.symbol(),
          erc20.decimals()
        ])
      } catch (e) {
        throw new Error('Failed to fetch ERC-20 data.', {
          cause: e
        })
      }
    }

    const erc20Data: Erc20Data = {
      name: name ?? getDefaultTokenName(address),
      symbol: symbol ?? getDefaultTokenSymbol(address),
      decimals: decimals ?? defaultErc20Decimals,
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
    captureSentryErrorWithExtraData({
      error,
      originFunction: 'fetchErc20Data',
      additionalData: {
        token_address_on_this_chain: address,
        chain: chainId.toString()
      }
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
    const chainId = await getChainIdFromProvider(provider)
    captureSentryErrorWithExtraData({
      error,
      originFunction: 'fetchErc20Allowance',
      additionalData: {
        token_address_on_this_chain: address,
        chain: chainId.toString()
      }
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
    return await erc20Bridger.getParentErc20Address(erc20L2Address, l2Provider)
  } catch (error) {
    return null
  }
}

/*
 Retrieves the parent chain gateway of an ERC-20 token using its parent chain address.
*/
export async function fetchErc20ParentChainGatewayAddress({
  erc20ParentChainAddress,
  parentChainProvider,
  childChainProvider
}: {
  erc20ParentChainAddress: string
  parentChainProvider: Provider
  childChainProvider: Provider
}): Promise<string> {
  const erc20Bridger = await Erc20Bridger.fromProvider(childChainProvider)
  return erc20Bridger.getParentGatewayAddress(
    erc20ParentChainAddress,
    parentChainProvider
  )
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
  return erc20Bridger.getChildGatewayAddress(erc20L1Address, l2Provider)
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
  return await erc20Bridger.getChildErc20Address(erc20L1Address, l1Provider)
}

// Given an L1 token address, derive it's L3 counterpart address
// this address will be then used for calculating balances etc.
export async function getL3ERC20Address({
  erc20L1Address,
  l1Provider,
  l3Provider
}: {
  erc20L1Address: string
  l1Provider: Provider
  l3Provider: Provider
}): Promise<string> {
  const l3Network = await getArbitrumNetwork(l3Provider)
  const l1l3Bridger = new Erc20L1L3Bridger(l3Network)

  const { l2Provider } = await getL2ConfigForTeleport({
    destinationChainProvider: l3Provider
  })
  return await l1l3Bridger.getL3Erc20Address(
    erc20L1Address,
    l1Provider,
    l2Provider // this is the actual l2 provider
  )
}

function isErc20Bridger(
  bridger: Erc20Bridger | Erc20L1L3Bridger
): bridger is Erc20Bridger {
  return typeof (bridger as Erc20Bridger).isDepositDisabled !== 'undefined'
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
  const erc20Bridger = await getBridger({
    sourceChainId: await getChainIdFromProvider(l1Provider),
    destinationChainId: await getChainIdFromProvider(l2Provider)
  })

  if (
    erc20Bridger instanceof EthL1L3Bridger ||
    erc20Bridger instanceof EthBridger
  ) {
    // fail-safe to ensure `l1TokenIsDisabled` is called on the correct bridger-types
    return false
  }

  return isErc20Bridger(erc20Bridger)
    ? erc20Bridger.isDepositDisabled(erc20L1Address, l1Provider)
    : erc20Bridger.l1TokenIsDisabled(erc20L1Address, l1Provider)
}

type SanitizeTokenOptions = {
  erc20L1Address?: string | null // token address on L1
  chainId: ChainId // chainId for which we want to retrieve the token name / symbol
}

export const isTokenArbitrumOneCU = (tokenAddress: string | undefined) =>
  addressesEqual(tokenAddress, CommonAddress.ArbitrumOne.CU)

export const isTokenXaiMainnetCU = (tokenAddress: string | undefined) =>
  addressesEqual(tokenAddress, CommonAddress[660279].CU)

export const isTokenMainnetUSDC = (tokenAddress: string | undefined) =>
  addressesEqual(tokenAddress, CommonAddress.Ethereum.USDC)

export const isTokenArbitrumOneUSDCe = (tokenAddress: string | undefined) =>
  addressesEqual(tokenAddress, CommonAddress.ArbitrumOne['USDC.e'])

export const isTokenSepoliaUSDC = (tokenAddress: string | undefined) =>
  addressesEqual(tokenAddress, CommonAddress.Sepolia.USDC)

export const isTokenArbitrumSepoliaUSDCe = (tokenAddress: string | undefined) =>
  addressesEqual(tokenAddress, CommonAddress.ArbitrumSepolia['USDC.e'])

export const isTokenArbitrumOneUSDT = (tokenAddress: string | undefined) =>
  addressesEqual(tokenAddress, CommonAddress.ArbitrumOne.USDT)

export const isTokenArbitrumOneNativeUSDC = (
  tokenAddress: string | undefined
) => addressesEqual(tokenAddress, CommonAddress.ArbitrumOne.USDC)

export const isTokenArbitrumSepoliaNativeUSDC = (
  tokenAddress: string | undefined
) => addressesEqual(tokenAddress, CommonAddress.ArbitrumSepolia.USDC)

export const isTokenNativeUSDC = (tokenAddress: string | undefined) => {
  return (
    isTokenMainnetUSDC(tokenAddress) ||
    isTokenSepoliaUSDC(tokenAddress) ||
    isTokenArbitrumOneNativeUSDC(tokenAddress) ||
    isTokenArbitrumSepoliaNativeUSDC(tokenAddress)
  )
}

export const isTokenEthereumUSDT = (tokenAddress: string | undefined) =>
  addressesEqual(tokenAddress, CommonAddress.Ethereum.USDT)

export const isTokenUSDT = (tokenAddress: string | undefined) =>
  isTokenEthereumUSDT(tokenAddress) || isTokenArbitrumOneUSDT(tokenAddress)

// get the exact token symbol for a particular chain
export function sanitizeTokenSymbol(
  tokenSymbol: string,
  options: SanitizeTokenOptions
) {
  if (!options.erc20L1Address) {
    return tokenSymbol
  }

  const { isArbitrumOne, isArbitrumSepolia, isEthereumMainnet } = isNetwork(
    options.chainId
  )

  if (
    addressesEqual(options.erc20L1Address, CommonAddress.Ethereum.USDT) &&
    isEthereumMainnet
  ) {
    return 'USDT'
  }

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

  if (isTokenArbitrumOneCU(options.erc20L1Address)) {
    if (isArbitrumOne) return 'CU'
    return 'wCU'
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

  const { isArbitrumOne, isArbitrumSepolia, isEthereumMainnet } = isNetwork(
    options.chainId
  )

  if (
    addressesEqual(options.erc20L1Address, CommonAddress.Ethereum.USDT) &&
    isEthereumMainnet
  ) {
    return 'USDT'
  }

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

  if (isTokenArbitrumOneCU(options.erc20L1Address)) {
    if (isArbitrumOne) return 'Crypto Unicorns'
    return 'Wrapped Crypto Unicorns'
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
  // for teleport transfers - we will need to check for 2 gateway registrations - 1 for L1-L2 and then for L2-L3 transfer
  // for now, we are returning true since we are limiting the tokens to teleport, but we will expand this once we expand the allowList
  const sourceChainId = await getChainIdFromProvider(parentChainProvider)
  const destinationChainId = await getChainIdFromProvider(childChainProvider)
  if (isValidTeleportChainPair({ sourceChainId, destinationChainId })) {
    return true
  }

  const erc20Bridger = await Erc20Bridger.fromProvider(childChainProvider)

  return erc20Bridger.isRegistered({
    erc20ParentAddress: erc20ParentChainAddress,
    parentProvider: parentChainProvider,
    childProvider: childChainProvider
  })
}
