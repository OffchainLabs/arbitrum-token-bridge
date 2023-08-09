import dayjs from 'dayjs'
import { useAccount, useBlockNumber } from 'wagmi'

import { getBlockTime, getNetworkName } from '../../util/networks'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import { MergedTransaction } from '../../state/app/state'
import { WithdrawalCountdown } from '../common/WithdrawalCountdown'
import {
  WithdrawalCardContainer,
  WithdrawalL1TxStatus,
  WithdrawalL2TxStatus
} from './WithdrawalCard'
import { Button } from '../common/Button'
import { Tooltip } from '../common/Tooltip'
import { isCustomDestinationAddressTx } from '../../state/app/utils'
import { formatAmount } from '../../util/NumberUtils'
import { useEffect, useMemo, useState } from 'react'
import { sanitizeTokenSymbol } from '../../util/TokenUtils'
import { CustomAddressTxExplorer } from '../TransactionHistory/TransactionsTable/TransactionsTable'
import { CCTPSupportedChainId } from '../../hooks/CCTP/useCCTP'
import { getBlockBeforeConfirmation, useCctpState } from '../../state/cctpState'

function useRemainingTime(tx: MergedTransaction) {
  const { data: currentBlockNumber } = useBlockNumber({
    chainId: tx.cctpData?.sourceChainId,
    watch: true
  })

  const requiredBlocksBeforeConfirmation = getBlockBeforeConfirmation(
    tx.cctpData?.sourceChainId as CCTPSupportedChainId
  )
  const blockTime =
    tx.cctpData?.sourceChainId && tx.direction === 'deposit'
      ? getBlockTime(tx.cctpData.sourceChainId)
      : 15

  const [remainingTime, setRemainingTime] = useState<string | null>(null)
  const [isConfirmed, setIsConfirmed] = useState(false)

  useEffect(() => {
    if (!currentBlockNumber || !tx.blockNum) {
      return
    }

    const elapsedBlocks = Math.max(currentBlockNumber - tx.blockNum, 0)
    const blocksLeftBeforeConfirmation = Math.max(
      requiredBlocksBeforeConfirmation - elapsedBlocks,
      0
    )
    const withdrawalDate = dayjs().add(
      blocksLeftBeforeConfirmation * blockTime,
      'second'
    )

    if (blocksLeftBeforeConfirmation === 0) {
      setIsConfirmed(true)
    }
    setRemainingTime(dayjs().to(withdrawalDate, true))
  }, [
    blockTime,
    currentBlockNumber,
    requiredBlocksBeforeConfirmation,
    tx.blockNum
  ])

  return {
    remainingTime,
    isConfirmed
  }
}

export function ClaimableCardUnconfirmed({
  tx,
  sourceNetwork
}: {
  tx: MergedTransaction
  sourceNetwork: 'L1' | 'L2'
}) {
  const { l1, l2 } = useNetworksAndSigners()
  const { address } = useAccount()
  const { updatePendingTransfer } = useCctpState({
    l1ChainId: l1.network.id, // TODO: update l1 of the transaction?
    walletAddress: address
  })

  const networkName = getNetworkName(
    sourceNetwork === 'L2' ? l1.network.id : l2.network.id
  )

  const tokenSymbol = useMemo(
    () =>
      sanitizeTokenSymbol(tx.asset, {
        erc20L1Address: tx.tokenAddress,
        chain: sourceNetwork === 'L2' ? l2.network : l1.network
      }),
    [tx.asset, tx.tokenAddress, sourceNetwork, l2.network, l1.network]
  )

  const { remainingTime, isConfirmed } = useRemainingTime(tx)
  useEffect(() => {
    if (isConfirmed) {
      updatePendingTransfer({
        ...tx,
        status: 'Confirmed'
      })
    }
  }, [isConfirmed, tx, updatePendingTransfer])

  return (
    <WithdrawalCardContainer tx={tx} sourceNetwork={sourceNetwork}>
      <div className="flex flex-row flex-wrap items-center justify-between">
        <div className="flex flex-col lg:ml-[-2rem]">
          <span className="ml-8 text-lg text-ocl-blue lg:ml-0 lg:text-2xl">
            Moving {formatAmount(Number(tx.value), { symbol: tokenSymbol })} to{' '}
            {networkName}
          </span>

          <span className="animate-pulse text-sm text-gray-dark">
            {tx.nodeBlockDeadline ? (
              <WithdrawalCountdown nodeBlockDeadline={tx.nodeBlockDeadline} />
            ) : tx.isCctp ? (
              <>{remainingTime}</>
            ) : (
              <span>Calculating...</span>
            )}
          </span>

          <div className="h-2" />
          <div className="flex flex-col font-light">
            {sourceNetwork === 'L2' ? (
              <>
                <span className="flex flex-nowrap gap-1 text-sm text-ocl-blue lg:text-base">
                  L2 transaction: <WithdrawalL2TxStatus tx={tx} />
                </span>
                <span className="flex flex-nowrap gap-1 text-sm text-ocl-blue lg:text-base">
                  L1 transaction: Will show after claiming
                </span>
              </>
            ) : (
              <>
                <span className="flex flex-nowrap gap-1 text-sm text-ocl-blue lg:text-base">
                  L1 transaction: <WithdrawalL1TxStatus tx={tx} />
                </span>
                <span className="flex flex-nowrap gap-1 text-sm text-ocl-blue lg:text-base">
                  L2 transaction: Will show after claiming
                </span>
              </>
            )}
            {isCustomDestinationAddressTx(tx) && (
              <span className="mt-2 flex flex-nowrap gap-1 text-sm text-gray-dark lg:text-base">
                <CustomAddressTxExplorer
                  tx={tx}
                  explorerClassName="arb-hover text-blue-link"
                />
              </span>
            )}
          </div>
        </div>

        <Tooltip content={<span>Funds aren&apos;t ready to claim yet</span>}>
          <Button
            variant="primary"
            className="absolute bottom-0 right-0 text-sm lg:my-4 lg:text-lg"
            disabled
          >
            <div className="flex flex-nowrap whitespace-pre">
              Claim{' '}
              <span className="hidden lg:flex">
                {formatAmount(Number(tx.value), {
                  symbol: tokenSymbol
                })}
              </span>
            </div>
          </Button>
        </Tooltip>
      </div>
    </WithdrawalCardContainer>
  )
}
