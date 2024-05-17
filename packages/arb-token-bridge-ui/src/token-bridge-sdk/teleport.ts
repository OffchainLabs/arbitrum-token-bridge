// utils for teleport type transactions

import { Provider } from '@ethersproject/providers'
import { providers, BigNumber } from 'ethers'
import { Erc20L1L3Bridger, EthL1L3Bridger, getL2Network } from '@arbitrum/sdk'
import { L1GatewayRouter__factory } from '@arbitrum/sdk/dist/lib/abi/factories/L1GatewayRouter__factory'
import { IInbox__factory } from '@arbitrum/sdk/dist/lib/abi/factories/IInbox__factory'
import { IBridge__factory } from '@arbitrum/sdk/dist/lib/abi/factories/IBridge__factory'
import { IRollupCore__factory } from '@arbitrum/sdk/dist/lib/abi/factories/IRollupCore__factory'
import { getProviderForChainId } from './utils'
import { TELEPORT_ALLOWLIST } from '../util/networks'

export const isTeleport = ({
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
  const l3Network = await getL2Network(destinationChainProvider)
  const l2ChainId = l3Network.partnerChainID
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
  const l3Network = await getL2Network(destinationChainProvider)

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

async function isContract(
  address: string,
  provider: providers.Provider
): Promise<boolean> {
  const code = await provider.getCode(address)
  return code !== '0x'
}

async function tryGetInboxFromRouter(
  address: string,
  provider: providers.Provider
): Promise<string | undefined> {
  if (!(await isContract(address, provider))) {
    throw new Error('Not a contract')
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
  provider: providers.Provider
): Promise<BigNumber> {
  const inbox = IInbox__factory.connect(address, provider)
  const bridge = IBridge__factory.connect(await inbox.bridge(), provider)
  const rollup = IRollupCore__factory.connect(await bridge.rollup(), provider)
  return rollup.chainId()
}

async function getChainIdFromInboxOrRouter(
  address: string,
  provider: providers.Provider
): Promise<BigNumber> {
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

  const l2Provider = getProviderForChainId(+l2ChainId.toString())

  // get the chain id for the l3 network
  const l3ChainId = await getChainIdFromInboxOrRouter(
    l2l3RouterOrInbox,
    l2Provider
  )

  // cache this value for faster fetches and saving RPC calls
  cache[`${l2l3RouterOrInbox}-${l1l2Router}`] = +l3ChainId.toString()

  return +l3ChainId.toString()
}
