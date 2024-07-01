import { Provider } from '@ethersproject/providers'
import { utils } from 'ethers'

import {
  fetchDepositsFromSubgraph,
  FetchDepositsFromSubgraphResult
} from './fetchDepositsFromSubgraph'
import { AssetType } from '../../hooks/arbTokenBridge.types'
import { Transaction } from '../../hooks/useTransactions'
import { defaultErc20Decimals } from '../../defaults'
import { fetchNativeCurrency } from '../../hooks/useNativeCurrency'

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

/* Fetch complete deposits - both ETH and Token deposits from subgraph into one list */
/* Also fills in any additional data required per transaction for our UI logic to work well */
/* TODO : Add event logs as well */
export const fetchDeposits = async ({
  sender,
  receiver,
  fromBlock,
  toBlock,
  l1Provider,
  l2Provider,
  pageSize = 10,
  pageNumber = 0,
  searchString = ''
}: FetchDepositParams): Promise<Transaction[]> => {
  if (typeof sender === 'undefined' && typeof receiver === 'undefined')
    return []
  if (!l1Provider || !l2Provider) return []

  const l1ChainId = (await l1Provider.getNetwork()).chainId
  const l2ChainId = (await l2Provider.getNetwork()).chainId

  const nativeCurrency = await fetchNativeCurrency({ provider: l2Provider })

  if (!fromBlock) {
    fromBlock = 0
  }

  let depositsFromSubgraph: FetchDepositsFromSubgraphResult[] = []
  try {
    depositsFromSubgraph = await fetchDepositsFromSubgraph({
      sender,
      receiver,
      fromBlock,
      toBlock,
      l2ChainId,
      pageSize,
      pageNumber,
      searchString
    })
  } catch (error: any) {
    console.log('Error fetching deposits from subgraph', error)
  }

  const mappedDepositsFromSubgraph: Transaction[] = depositsFromSubgraph.map(
    (tx: FetchDepositsFromSubgraphResult) => {
      const isEthDeposit = tx.type === 'EthDeposit'

      const assetDetails = {
        assetName: nativeCurrency.symbol,
        assetType: AssetType.ETH,
        tokenAddress: ''
      }

      if (!isEthDeposit) {
        // update some values for token deposit
        const symbol = tx.l1Token?.symbol || ''

        assetDetails.assetName = symbol
        assetDetails.assetType = AssetType.ERC20
        assetDetails.tokenAddress = tx?.l1Token?.id || ''
      }

      const amount = isEthDeposit ? tx.ethValue : tx.tokenAmount

      const tokenDecimals = tx?.l1Token?.decimals ?? defaultErc20Decimals
      const decimals = isEthDeposit ? nativeCurrency.decimals : tokenDecimals

      return {
        type: 'deposit-l1',
        status: 'pending',
        direction: 'deposit',
        source: 'subgraph',
        value: utils.formatUnits(amount || 0, decimals),
        txID: tx.transactionHash,
        tokenAddress: assetDetails.tokenAddress,
        sender: tx.sender,
        destination: tx.receiver,

        assetName: assetDetails.assetName,
        assetType: assetDetails.assetType,

        l1NetworkID: String(l1ChainId),
        l2NetworkID: String(l2ChainId),
        blockNumber: Number(tx.blockCreatedAt),
        timestampCreated: tx.timestamp,
        isClassic: tx.isClassic,

        childChainId: l2ChainId,
        parentChainId: l1ChainId
      }
    }
  )

  return mappedDepositsFromSubgraph
}
