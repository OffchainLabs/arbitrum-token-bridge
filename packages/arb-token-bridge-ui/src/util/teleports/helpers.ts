import { utils } from 'ethers'
import { getProviderForChainId } from '@/token-bridge-sdk/utils'
import { RetryableMessageParams } from '@arbitrum/sdk'
import {
  fetchTeleportInputParametersFromTxId,
  getL3ChainIdFromTeleportEvents
} from '@/token-bridge-sdk/teleport'
import { Transfer } from '../../hooks/useTransactionHistory'
import { MergedTransaction } from '../../state/app/state'
import { FetchEthTeleportsFromSubgraphResult } from './fetchEthTeleportsFromSubgraph'
import { TeleportFromSubgraph } from './fetchTeleports'
import { AssetType } from '../../hooks/arbTokenBridge.types'
import { Transaction } from '../../hooks/useTransactions'
import { transformDeposit } from '../../state/app/utils'
import { updateAdditionalDepositData } from '../deposits/helpers'
import { fetchErc20Data } from '../TokenUtils'

export function isTransferTeleportFromSubgraph(
  tx: Transfer
): tx is TeleportFromSubgraph {
  return typeof (tx as TeleportFromSubgraph).teleport_type !== 'undefined'
}

function isTransactionEthTeleportFromSubgraph(
  tx: TeleportFromSubgraph
): tx is FetchEthTeleportsFromSubgraphResult {
  return tx.teleport_type === 'eth'
}

// converts the `teleport-from-subgraph` to our tx-history compatible `merged-transaction` type
// detects the token and destination `l3ChainId` in case of ERC20 teleports
export async function transformTeleportFromSubgraph(
  tx: TeleportFromSubgraph
): Promise<MergedTransaction> {
  const parentProvider = getProviderForChainId(Number(tx.parentChainId))

  // Eth transfers
  if (isTransactionEthTeleportFromSubgraph(tx)) {
    // to get the exact value of the ETH deposit we need to fetch the teleport parameters, otherwise tx.value will also include all the L2,L3 gas fee paid
    const depositParameters = (await fetchTeleportInputParametersFromTxId({
      txId: tx.transactionHash,
      sourceChainProvider: parentProvider,
      destinationChainProvider: getProviderForChainId(Number(tx.childChainId)),
      isNativeCurrencyTransfer: true
    })) as {
      l1l2TicketData: RetryableMessageParams
      l2l3TicketData: RetryableMessageParams
    }

    const depositTx = {
      type: 'deposit-l1',
      status: 'pending',
      direction: 'deposit',
      source: 'subgraph',
      value: utils.formatEther(
        depositParameters.l2l3TicketData.l2CallValue.toString() || 0
      ),
      txID: tx.transactionHash,
      tokenAddress: '',
      sender: tx.sender,
      destination: tx.sender,
      assetName: 'ETH',
      assetType: AssetType.ETH,
      l1NetworkID: tx.parentChainId,
      l2NetworkID: tx.childChainId,
      blockNumber: Number(tx.blockCreatedAt),
      timestampCreated: tx.timestamp,
      isClassic: false,
      parentChainId: Number(tx.parentChainId),
      childChainId: Number(tx.childChainId)
    } as Transaction

    const childProvider = getProviderForChainId(Number(tx.childChainId))
    return transformDeposit(
      await updateAdditionalDepositData({
        depositTx,
        parentProvider,
        childProvider
      })
    )
  }

  // Erc20 transfers
  const l1TokenAddress = tx.l1Token
  const { symbol, decimals } = await fetchErc20Data({
    address: l1TokenAddress,
    provider: parentProvider
  })
  const l3ChainId = await getL3ChainIdFromTeleportEvents(tx, parentProvider)
  const transactionDetails = await parentProvider.getTransaction(
    tx.transactionHash
  ) // we need to fetch the transaction details to get the blockNumber

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
    l1NetworkID: tx.parentChainId,
    l2NetworkID: String(l3ChainId),
    blockNumber: Number(transactionDetails.blockNumber),
    timestampCreated: tx.timestamp,
    isClassic: false,
    parentChainId: Number(tx.parentChainId),
    childChainId: l3ChainId
  } as Transaction

  const childProvider = getProviderForChainId(l3ChainId)
  return transformDeposit(
    await updateAdditionalDepositData({
      depositTx,
      parentProvider,
      childProvider
    })
  )
}
