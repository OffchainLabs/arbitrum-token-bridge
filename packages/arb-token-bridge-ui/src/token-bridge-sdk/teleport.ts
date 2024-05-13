// utils for teleport type transactions

import { Provider } from '@ethersproject/providers'
import { Erc20L1L3Bridger, EthL1L3Bridger, getL2Network } from '@arbitrum/sdk'
import { getProviderForChainId } from './utils'
import { TELEPORT_ALLOWLIST } from '../util/networks'

export const isTeleport = ({
  sourceChainId,
  destinationChainId
}: {
  sourceChainId: number
  destinationChainId: number
}) => {
  return TELEPORT_ALLOWLIST[sourceChainId]?.includes(destinationChainId)
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

export const getTeleportStatusDataFromTxId = async ({
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

  return l1l3Bridger.getDepositMessages({
    txHash: txId,
    l1Provider: sourceChainProvider,
    l2Provider,
    l3Provider: destinationChainProvider
  })
}
