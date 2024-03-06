import { useAccount } from 'wagmi'
import { useEffect, useState } from 'react'
import { BridgeTransfer } from '../../token-bridge-sdk/BridgeTransfer'
import { BridgeTransferFactory } from '../../token-bridge-sdk/BridgeTransferFactory'
import { getBridgeTransferKey } from '../../token-bridge-sdk/utils'
import { twMerge } from 'tailwind-merge'
import { useTransactionHistory } from '../../hooks/useTransactionHistory'
import { AssetType } from '../../hooks/arbTokenBridge.types'
import { Loader } from '../common/atoms/Loader'

export type SdkRequiredTxData = {
  sourceChainTxHash: string
  sourceChainId: number
  destinationChainId: number
  sourceChainErc20Address?: string
  isNativeCurrencyTransfer?: boolean
  isCctpTransfer?: boolean
}

export const TransactionHistoryMini = () => {
  const { address } = useAccount()
  const { transactions } = useTransactionHistory(address)

  const sdkCompatibleTransactions: SdkRequiredTxData[] = transactions
    .filter(tx => tx.parentChainId !== 1337) // ignore local-node
    .map(tx => ({
      ...tx,
      sourceChainTxHash: tx.txId,
      sourceChainId: tx.sourceChainId,
      destinationChainId: tx.destinationChainId,
      isNativeCurrencyTransfer: tx.assetType === AssetType.ETH,
      isCctpTransfer: tx.isCctp || typeof tx.cctpData !== 'undefined'
    }))

  const [skdTransactions, setSdkTransactions] = useState<{
    [id: string]: BridgeTransfer
  }>({})

  const transactionHistorySequence = sdkCompatibleTransactions.filter(
    tx => tx.sourceChainTxHash
  )
  const transactionHistorySequenceKeys = transactionHistorySequence
    .map(tx => tx.sourceChainTxHash)
    .join('_')

  // create a map of `l1chainId_l2chainId_sourceChainTxHash` to BridgeTransfer instance

  // what do i want?
  // a single-source of truth map of transactions that are self updating their own state..
  // status of any txns can be known by BridgeTransactions[txKey]

  useEffect(() => {
    const initSdkTransactions = async () => {
      const preSdkInformation: { [id: string]: SdkRequiredTxData } = {}

      for (const tx of transactionHistorySequence) {
        const txKey = getBridgeTransferKey({
          sourceChainId: tx.sourceChainId,
          destinationChainId: tx.destinationChainId,
          sourceChainTxHash: tx.sourceChainTxHash
        })

        if (!skdTransactions[txKey] && !preSdkInformation[txKey]) {
          preSdkInformation[txKey] = {
            sourceChainTxHash: tx.sourceChainTxHash,
            sourceChainId: tx.sourceChainId,
            destinationChainId: tx.destinationChainId,
            sourceChainErc20Address: tx.sourceChainErc20Address,
            isNativeCurrencyTransfer: tx.isNativeCurrencyTransfer,
            isCctpTransfer: tx.isCctpTransfer
          }
        }
      }
      const transfers = Object.keys(preSdkInformation).map(key => {
        const tx = preSdkInformation[key]
        return tx ? BridgeTransferFactory.init(tx) : null
      })

      const _sdkTransactions = { ...skdTransactions }
      await Promise.all(transfers).then(res => {
        res.forEach((transfer, i) => {
          if (transfer && !skdTransactions[transfer.key]) {
            transfer.pollForStatus()
            transfer.watch({
              onChange: props => {
                console.log(
                  `${props?.property} changed for ${transfer.key} to ${props?.value}`
                )
                setSdkTransactions(prev => ({
                  ...prev,
                  [transfer.key]: transfer
                }))
              }
            })

            _sdkTransactions[transfer.key] = transfer
          }
        })
      })

      setSdkTransactions(prev => {
        return { ...prev, ..._sdkTransactions }
      })
    }

    initSdkTransactions()

    return () => {
      // stop the polling on txns that are unmounting
      Object.values(skdTransactions).forEach(transfer => {
        transfer.stopPollingForStatus()
      })
    }
  }, [transactionHistorySequenceKeys])

  // useEffect(() => {
  //   // making stuff reactive

  //   setInterval(() => {

  //   }, 1000)
  // }, [])

  return (
    <div className="w-[700px] rounded-lg bg-white text-sm">
      Transaction history mini
      {transactionHistorySequence.map(tx => {
        const transferKey = getBridgeTransferKey({
          sourceChainId: tx.sourceChainId,
          destinationChainId: tx.destinationChainId,
          sourceChainTxHash: tx.sourceChainTxHash
        })
        const bridgeTransfer = skdTransactions[transferKey]

        if (!bridgeTransfer) {
          return (
            <div key={transferKey} className="border border-dark">
              Awaiting details for {transferKey}
            </div>
          )
        }

        return (
          <TransactionHistoryMiniRow
            key={transferKey}
            bridgeTransfer={bridgeTransfer}
          />
        )
      })}
    </div>
  )
}

const TransactionHistoryMiniRow = ({
  bridgeTransfer
}: {
  bridgeTransfer: BridgeTransfer
}) => {
  return (
    <div
      className={twMerge(
        'border border-dark',
        bridgeTransfer.destinationChainTx?.hash ? 'bg-lime' : 'bg-orange'
      )}
    >
      <div>
        {bridgeTransfer.isFetchingStatus && (
          <Loader color="#28A0F0" size="small" />
        )}
      </div>
      <div>Type: {bridgeTransfer.transferType}</div>
      <div>Status: {bridgeTransfer.status}</div>
      <div>Source Tx: {bridgeTransfer.sourceChainTx.hash}</div>
      <div>Dest Tx: {bridgeTransfer.destinationChainTx?.hash}</div>
      <div>Txn clock: {bridgeTransfer.lastUpdatedTimestamp}</div>
      <div>Rerender update : {Date.now()}</div>
      {bridgeTransfer.isClaimable && (
        <div className="m-1 w-fit bg-black p-1 text-white">Claim</div>
      )}
    </div>
  )
}
