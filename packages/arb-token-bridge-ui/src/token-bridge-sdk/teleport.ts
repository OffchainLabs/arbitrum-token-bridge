// utils for teleport type transactions

import {
  Erc20L1L3Bridger,
  EthL1L3Bridger,
  L1TransactionReceipt,
  getChain
} from '@arbitrum/sdk'
import { getProvider } from '../components/TransactionHistory/helpers'
import { isNetwork } from '../util/networks'
import { Provider } from '@ethersproject/providers'

export const isTeleport = ({
  sourceChainId,
  destinationChainId
}: {
  sourceChainId: number
  destinationChainId: number
}) => {
  const isBaseChainEthereum =
    isNetwork(sourceChainId).isEthereumMainnetOrTestnet
  const isDestinationChainOrbit = isNetwork(destinationChainId).isOrbitChain

  return isBaseChainEthereum && isDestinationChainOrbit
}

export const getL2ConfigForTeleport = async ({
  destinationChainProvider
}: {
  destinationChainProvider: Provider
}) => {
  const l3Network = await getChain(destinationChainProvider)
  const l2ChainId = l3Network.partnerChainID
  const l2Provider = getProvider(l2ChainId)
  return { l2ChainId, l2Provider }
}

export const getTeleportStatusDataFromTxId = async ({
  txId,
  sourceChainProvider,
  destinationChainProvider,
  isNativeCurrencyTransfer
}: {
  txId: string
  sourceChainProvider: Provider
  destinationChainProvider: Provider
  isNativeCurrencyTransfer: boolean
}) => {
  const l1Provider = sourceChainProvider
  const l3Provider = destinationChainProvider

  // get the intermediate L2 chain provider
  const { l2Provider } = await getL2ConfigForTeleport({
    destinationChainProvider: l3Provider
  })

  const l3Network = await getChain(l3Provider)

  const depositTx = await l1Provider.getTransaction(txId)

  const depositReceipt =
    L1TransactionReceipt.monkeyPatchContractCallWait(depositTx)

  // just the type of bridger changes in case of Eth vs Erc20 teleport
  const l1l3Bridger = isNativeCurrencyTransfer
    ? new EthL1L3Bridger(l3Network)
    : new Erc20L1L3Bridger(l3Network)

  return l1l3Bridger.getDepositStatus(
    await depositReceipt.wait(),
    l2Provider,
    l3Provider
  )
}
