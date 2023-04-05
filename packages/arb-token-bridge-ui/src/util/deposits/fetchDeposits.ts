import { Provider } from '@ethersproject/providers'
import { AssetType, Transaction } from 'token-bridge-sdk'
import { utils } from 'ethers'
import { updateAdditionalDepositData } from './helpers'
import {
  fetchDepositsFromSubgraph,
  FetchDepositsFromSubgraphResult
} from './fetchDepositsFromSubgraph'
import { tryFetchLatestSubgraphBlockNumber } from '../SubgraphUtils'

export type FetchDepositParams = {
  walletAddress: string
  fromBlock?: number
  toBlock?: number
  l1Provider: Provider
  l2Provider: Provider
  pageSize?: number
  pageNumber?: number
  searchString?: string
}

/* Fetch complete deposits - both ETH and Token deposits from subgraph into one list */
/* Also fills in any additional data required per transaction for our UI logic to work well */
/* TODO : Add event logs as well */
export const fetchDeposits = async ({
  walletAddress,
  fromBlock,
  toBlock,
  l1Provider,
  l2Provider,
  pageSize = 10,
  pageNumber = 0,
  searchString = ''
}: FetchDepositParams): Promise<Transaction[]> => {
  if (!walletAddress || !l1Provider || !l2Provider) return []

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
    address: walletAddress,
    fromBlock,
    toBlock,
    l2ChainId,
    pageSize,
    pageNumber,
    searchString
  })

  const ethDepositsFromSubgraph: Transaction[] = depositsFromSubgraph.map(
    (tx: FetchDepositsFromSubgraphResult) => {
      const isEthDeposit = tx.type === 'EthDeposit'

      const assetDetails = {
        asset: 'ETH',
        assetName: 'ETH',
        assetType: AssetType.ETH,
        tokenAddress: ''
      }

      if (!isEthDeposit) {
        // update some values for token deposit
        const symbol = tx.l1Token?.symbol || ''

        assetDetails.asset = symbol
        assetDetails.assetName = symbol
        assetDetails.assetType = AssetType.ERC20
        assetDetails.tokenAddress = tx?.l1Token?.id || ''
      }

      return {
        type: 'deposit-l1',
        status: 'pending',
        value: utils.formatUnits(
          (isEthDeposit ? tx.ethValue : tx.tokenAmount) || 0,
          isEthDeposit ? 18 : tx?.l1Token?.decimals || 18
        ),
        txID: tx.transactionHash,
        tokenAddress: assetDetails.tokenAddress,
        sender: walletAddress,

        asset: assetDetails.asset,
        assetName: assetDetails.assetName,
        assetType: assetDetails.assetType,

        l1NetworkID: String(l1ChainId),
        l2NetworkID: String(l2ChainId),
        blockNumber: Number(tx.blockCreatedAt),
        timestampCreated: tx.timestamp,
        isClassic: tx.isClassic
      }
    }
  )

  const finalTransactions: Transaction[] = await Promise.all(
    ethDepositsFromSubgraph.map(depositTx =>
      updateAdditionalDepositData(depositTx, l1Provider, l2Provider)
    )
  )

  return finalTransactions
}
