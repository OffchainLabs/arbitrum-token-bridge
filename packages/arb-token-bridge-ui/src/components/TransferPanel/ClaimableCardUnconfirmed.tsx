import { useEffect, useMemo } from 'react'

import { ChainId, getNetworkName, isNetwork } from '../../util/networks'
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
import { sanitizeTokenSymbol } from '../../util/TokenUtils'
import { CustomAddressTxExplorer } from '../TransactionHistory/TransactionsTable/TransactionsTable'
import {
  getTargetChainIdFromSourceChain,
  useCctpState,
  useRemainingTime
} from '../../state/cctpState'

export function ClaimableCardUnconfirmed({ tx }: { tx: MergedTransaction }) {
  const { l1, l2 } = useNetworksAndSigners()
  const { updateTransfer } = useCctpState()
  // This component is used for withdrawal and Cctp, default to Arb1
  const sourceChainId = tx.cctpData?.sourceChainId ?? ChainId.ArbitrumOne
  const networkName = getNetworkName(getTargetChainIdFromSourceChain(tx))
  const { isEthereum } = isNetwork(sourceChainId)

  const tokenSymbol = useMemo(
    () =>
      sanitizeTokenSymbol(tx.asset, {
        erc20L1Address: tx.tokenAddress,
        chain: isEthereum ? l1.network : l2.network
      }),
    [tx.asset, tx.tokenAddress, isEthereum, l1.network, l2.network]
  )

  const { remainingTime, isConfirmed } = useRemainingTime(tx)
  useEffect(() => {
    if (isConfirmed) {
      updateTransfer({
        ...tx,
        status: 'Confirmed'
      })
    }
  }, [isConfirmed, tx, updateTransfer])

  return (
    <WithdrawalCardContainer tx={tx}>
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
            {isEthereum ? (
              <>
                <span className="flex flex-nowrap gap-1 text-sm text-ocl-blue lg:text-base">
                  L1 transaction: <WithdrawalL1TxStatus tx={tx} />
                </span>
                <span className="flex flex-nowrap gap-1 text-sm text-ocl-blue lg:text-base">
                  L2 transaction: Will show after claiming
                </span>
              </>
            ) : (
              <>
                <span className="flex flex-nowrap gap-1 text-sm text-ocl-blue lg:text-base">
                  L2 transaction: <WithdrawalL2TxStatus tx={tx} />
                </span>
                <span className="flex flex-nowrap gap-1 text-sm text-ocl-blue lg:text-base">
                  L1 transaction: Will show after claiming
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
