import { utils } from 'ethers'
import { Transfer } from '../../hooks/useTransactionHistory'
import { MergedTransaction } from '../../state/app/state'
import { FetchEthTeleportsFromSubgraphResult } from './fetchEthTeleportsFromSubgraph'
import { TeleportFromSubgraph } from './fetchTeleports'
import { AssetType } from '../../hooks/arbTokenBridge.types'
import { Transaction } from '../../hooks/useTransactions'
import { transformDeposit } from '../../state/app/utils'
import { updateAdditionalDepositData } from '../deposits/helpers'
import { fetchErc20Data } from '../TokenUtils'
import { getProviderForChainId } from '@/token-bridge-sdk/utils'
import { getL3ChainIdFromTeleportEvents } from '@/token-bridge-sdk/teleport'

export function isTransferTeleportFromSubgraph(
  tx: Transfer
): tx is TeleportFromSubgraph {
  // @ts-ignore: `teleport_type` is present only in teleport-from-subgraph types, we ignore it for other types
  return typeof tx.teleport_type !== 'undefined'
}

export function isTransactionEthTeleportFromSubgraph(
  tx: TeleportFromSubgraph
): tx is FetchEthTeleportsFromSubgraphResult {
  return tx.teleport_type === 'eth'
}

export async function transformTeleportTransaction(
  tx: TeleportFromSubgraph
): Promise<MergedTransaction> {
  const parentChainProvider = getProviderForChainId(Number(tx.l1ChainId))
  const transactionDetails = await parentChainProvider.getTransaction(
    tx.transactionHash
  ) // we need to fetch the transaction details to get the exact value (subgraphs sometimes return negative values in retryables)

  // Eth transfers
  if (isTransactionEthTeleportFromSubgraph(tx)) {
    const depositTx = {
      type: 'deposit-l1',
      status: 'pending',
      direction: 'deposit',
      source: 'subgraph',
      value: utils.formatUnits(transactionDetails.value || 0, 18),
      txID: tx.transactionHash,
      tokenAddress: '',
      sender: tx.sender,
      destination: tx.sender,
      assetName: 'ETH',
      assetType: AssetType.ETH,
      l1NetworkID: tx.l1ChainId,
      l2NetworkID: tx.l3ChainId,
      blockNumber: Number(tx.blockCreatedAt),
      timestampCreated: tx.timestamp,
      isClassic: false,
      parentChainId: Number(tx.l1ChainId),
      childChainId: Number(tx.l3ChainId)
    } as Transaction

    const childChainProvider = getProviderForChainId(Number(tx.l3ChainId))
    return transformDeposit(
      await updateAdditionalDepositData({
        depositTx,
        l1Provider: parentChainProvider,
        l2Provider: childChainProvider
      })
    )
  }

  // Erc20 transfers
  const l1TokenAddress = tx.l1Token
  const { symbol, decimals } = await fetchErc20Data({
    address: l1TokenAddress,
    provider: parentChainProvider
  })
  const l3ChainId = await getL3ChainIdFromTeleportEvents(
    tx,
    parentChainProvider
  )
  const depositTx = {
    type: 'deposit-l1',
    status: 'pending',
    direction: 'deposit',
    source: 'subgraph',
    value: utils.formatUnits(tx.amount || 0, decimals),
    txID: tx.transactionHash,
    tokenAddress: l1TokenAddress,
    sender: tx.sender,
    destination: tx.sender,
    assetName: symbol,
    assetType: AssetType.ERC20,
    l1NetworkID: tx.l1ChainId,
    l2NetworkID: String(l3ChainId),
    blockNumber: Number(transactionDetails.blockNumber),
    timestampCreated: tx.timestamp,
    isClassic: false,
    parentChainId: Number(tx.l1ChainId),
    childChainId: l3ChainId
  } as Transaction

  const childChainProvider = getProviderForChainId(l3ChainId)
  return transformDeposit(
    await updateAdditionalDepositData({
      depositTx,
      l1Provider: parentChainProvider,
      l2Provider: childChainProvider
    })
  )
}
