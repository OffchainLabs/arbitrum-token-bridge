// utils for teleport type transactions

import { Provider } from '@ethersproject/providers'
import {
  Erc20L1L3Bridger,
  EthL1L3Bridger,
  getArbitrumNetwork
} from '@arbitrum/sdk'
import { L1GatewayRouter__factory } from '@arbitrum/sdk/dist/lib/abi/factories/L1GatewayRouter__factory'
import { IInbox__factory } from '@arbitrum/sdk/dist/lib/abi/factories/IInbox__factory'
import { IBridge__factory } from '@arbitrum/sdk/dist/lib/abi/factories/IBridge__factory'
import { IRollupCore__factory } from '@arbitrum/sdk/dist/lib/abi/factories/IRollupCore__factory'
import { getChainIdFromProvider, getProviderForChainId } from './utils'
import { TELEPORT_ALLOWLIST } from '../util/networks'
import { getAccountType } from '../util/AccountUtils'
import { addressIsSmartContract } from '../util/AddressUtils'

export const isValidTeleportChainPair = ({
  sourceChainId,
  destinationChainId
}: {
  sourceChainId: number
  destinationChainId: number
}) => {
  return !!TELEPORT_ALLOWLIST[sourceChainId]?.includes(destinationChainId)
}

export const getL2ConfigForTeleport = async ({
  destinationChainProvider
}: {
  destinationChainProvider: Provider
}) => {
  const l3Network = await getArbitrumNetwork(destinationChainProvider)
  const l2ChainId = l3Network.parentChainId
  const l2Provider = getProviderForChainId(l2ChainId)
  return { l2ChainId, l2Provider }
}

export const fetchTeleportStatusFromTxId = async ({
  txId,
  sourceChainProvider,
  destinationChainProvider,
  isNativeCurrencyTransfer
}: {
  txId: string
  sourceChainProvider: Provider // L1 Provider
  destinationChainProvider: Provider // L3 Provider
  isNativeCurrencyTransfer: boolean
}) => {
  // get the intermediate L2 chain provider
  const { l2Provider } = await getL2ConfigForTeleport({
    destinationChainProvider
  })
  const l3Network = await getArbitrumNetwork(destinationChainProvider)

  // just the type of bridger changes in case of Eth vs Erc20 teleport
  const l1l3Bridger = isNativeCurrencyTransfer
    ? new EthL1L3Bridger(l3Network)
    : new Erc20L1L3Bridger(l3Network)

  return l1l3Bridger.getDepositStatus({
    txHash: txId,
    l1Provider: sourceChainProvider,
    l2Provider,
    l3Provider: destinationChainProvider
  })
}

async function tryGetInboxFromRouter(
  address: string,
  provider: Provider
): Promise<string | undefined> {
  const chainId = await getChainIdFromProvider(provider)

  if (!(await addressIsSmartContract(address, chainId))) {
    throw new Error(
      '[tryGetInboxFromRouter]: address passed is not a smart contract'
    )
  }

  if ((await getAccountType({ address, chainId })) === 'delegated-account') {
    throw new Error(
      '[tryGetInboxFromRouter]: address passed is a delegated wallet'
    )
  }

  const maybeRouter = L1GatewayRouter__factory.connect(address, provider)

  try {
    return await maybeRouter.inbox()
  } catch (e: any) {
    if (e.code === 'CALL_EXCEPTION') {
      return undefined
    }
    throw e
  }
}

async function getChainIdFromInbox(
  address: string,
  provider: Provider
): Promise<number> {
  const inbox = IInbox__factory.connect(address, provider)
  const bridge = IBridge__factory.connect(await inbox.bridge(), provider)
  const rollup = IRollupCore__factory.connect(await bridge.rollup(), provider)
  const chainIdBigNumber = await rollup.chainId()
  return Number(chainIdBigNumber.toString())
}

async function getChainIdFromInboxOrRouter(
  address: string,
  provider: Provider
): Promise<number> {
  const maybeInbox = await tryGetInboxFromRouter(address, provider)
  if (maybeInbox) {
    return getChainIdFromInbox(maybeInbox, provider)
  }

  return getChainIdFromInbox(address, provider)
}

const cache: { [id: string]: number } = {}
export const getL3ChainIdFromTeleportEvents = async (
  {
    l2l3RouterOrInbox,
    l1l2Router
  }: {
    l2l3RouterOrInbox: string
    l1l2Router: string
  },
  l1Provider: Provider
): Promise<number> => {
  const cacheKey = `${l2l3RouterOrInbox}-${l1l2Router}`

  const cachedValue = cache[cacheKey]
  if (typeof cachedValue !== 'undefined') {
    return cachedValue
  }

  // get the chain id for the l2 network
  const l2ChainId = await getChainIdFromInboxOrRouter(l1l2Router, l1Provider)

  const l2Provider = getProviderForChainId(l2ChainId)

  // get the chain id for the l3 network
  const l3ChainId = await getChainIdFromInboxOrRouter(
    l2l3RouterOrInbox,
    l2Provider
  )

  // cache this value for faster fetches and saving RPC calls
  cache[cacheKey] = l3ChainId

  return l3ChainId
}

export const fetchTeleportInputParametersFromTxId = async ({
  txId, // source chain tx id
  sourceChainProvider,
  destinationChainProvider,
  isNativeCurrencyTransfer
}: {
  txId: string
  sourceChainProvider: Provider
  destinationChainProvider: Provider
  isNativeCurrencyTransfer: boolean
}) => {
  const l3Network = await getArbitrumNetwork(destinationChainProvider)

  // get Eth deposit request
  if (isNativeCurrencyTransfer) {
    return await new EthL1L3Bridger(l3Network).getDepositParameters({
      txHash: txId,
      l1Provider: sourceChainProvider
    })
  }

  // get Erc20 deposit request
  const { l2Provider } = await getL2ConfigForTeleport({
    destinationChainProvider
  })
  return await new Erc20L1L3Bridger(l3Network).getDepositParameters({
    txHash: txId,
    l1Provider: sourceChainProvider,
    l2Provider
  })
}
