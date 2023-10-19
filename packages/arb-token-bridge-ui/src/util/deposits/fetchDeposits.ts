import { utils } from 'ethers'
import { Provider } from '@ethersproject/providers'
import { fetchDepositsFromSubgraph } from './fetchDepositsFromSubgraph'
import { tryFetchLatestSubgraphBlockNumber } from '../SubgraphUtils'
import { AssetType } from '../../hooks/arbTokenBridge.types'
import { Deposit } from '../../hooks/useMultiChainTransactionList'

export type FetchDepositParams = {
  sender?: string
  receiver?: string
  fromBlock?: number
  toBlock?: number
  l1Provider: Provider
  l2Provider: Provider
  pageSize?: number
  pageNumber?: number
  searchString?: string
}

export async function fetchDepositList({
  sender,
  receiver,
  fromBlock,
  toBlock,
  l1Provider,
  l2Provider,
  pageSize = 10,
  pageNumber = 0,
  searchString = ''
}: FetchDepositParams): Promise<Deposit[]> {
  if (typeof sender === 'undefined' && typeof receiver === 'undefined')
    return []
  if (!l1Provider || !l2Provider) return []

  const l1ChainId = (await l1Provider.getNetwork()).chainId
  const l2ChainId = (await l2Provider.getNetwork()).chainId

  if (!fromBlock) {
    fromBlock = 0
  }

  if (!toBlock) {
    // if toBlock hasn't been provided by the user

    // fetch the latest L1 block number thorough subgraph first
    let latestL1BlockNumber = await tryFetchLatestSubgraphBlockNumber(
      'L1',
      l2ChainId
    )

    // if the previous call returns 0, then fetch the latest block on-chain
    if (!latestL1BlockNumber) {
      latestL1BlockNumber = await l1Provider.getBlockNumber()
    }

    toBlock = latestL1BlockNumber
  }

  const depositsFromSubgraph = await fetchDepositsFromSubgraph({
    sender,
    receiver,
    fromBlock,
    toBlock,
    l2ChainId,
    pageSize,
    pageNumber,
    searchString
  })

  return depositsFromSubgraph.map(tx => {
    const isEth = tx.type === 'EthDeposit'

    const assetDetails = {
      asset: 'ETH',
      assetName: 'ETH',
      assetType: AssetType.ETH,
      tokenAddress: ''
    }

    if (!isEth) {
      // update some values for token deposit
      const symbol = tx.l1Token?.symbol || ''

      assetDetails.asset = symbol
      assetDetails.assetName = symbol
      assetDetails.assetType = AssetType.ERC20
      assetDetails.tokenAddress = tx?.l1Token?.id || ''
    }

    return {
      type: 'deposit-l1',
      direction: 'deposit',
      source: 'subgraph',
      l1NetworkID: String(l1ChainId),
      l2NetworkID: String(l2ChainId),
      // TODO: may need to format units here
      value: utils.formatUnits(
        (isEth ? tx.ethValue : tx.tokenAmount) || 0,
        isEth ? 18 : tx?.l1Token?.decimals || 18
      ),
      ...assetDetails,
      tokenAddress: isEth ? '' : tx.l1Token?.id,
      sender: tx.sender,
      destination: tx.receiver,
      txID: tx.transactionHash,
      blockNumber: Number(tx.blockCreatedAt),
      timestampCreated: tx.timestamp,
      isClassic: tx.isClassic,
      parentChainId: l1ChainId,
      chainId: l2ChainId
    }
  })
}
