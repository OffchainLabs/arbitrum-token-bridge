import { utils } from 'ethers'
import { defaultErc20Decimals } from '../../defaults'
import { AssetType } from '../../hooks/arbTokenBridge.types'
import { NativeCurrency } from '../../hooks/useNativeCurrency'
import { FetchDepositsFromSubgraphResult } from './fetchDepositsFromSubgraph'
import { Transaction } from '../../hooks/useTransactions'

export function mapDepositsFromSubgraph({
  depositsFromSubgraph,
  nativeCurrency,
  l1ChainId,
  l2ChainId
}: {
  depositsFromSubgraph: FetchDepositsFromSubgraphResult[]
  nativeCurrency: NativeCurrency
  l1ChainId: number
  l2ChainId: number
}): Transaction[] {
  return depositsFromSubgraph.map(tx => {
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
  })
}
