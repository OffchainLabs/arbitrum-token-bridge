import { useMemo } from 'react'

import { getNetworkName, isNetwork } from '../../util/networks'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import { MergedTransaction } from '../../state/app/state'
import { WithdrawalCountdown } from '../common/WithdrawalCountdown'
import {
  WithdrawalCardContainer,
  WithdrawalL1TxStatus,
  WithdrawalL2TxStatus
} from './WithdrawalCard'
import { isCustomDestinationAddressTx } from '../../state/app/utils'
import { formatAmount } from '../../util/NumberUtils'
import { sanitizeTokenSymbol } from '../../util/TokenUtils'
import { CustomAddressTxExplorer } from '../TransactionHistory/TransactionsTable/TransactionsTable'
import {
  getTargetChainIdFromSourceChain,
  useRemainingTime
} from '../../state/cctpState'
import { useChainLayers } from '../../hooks/useChainLayers'

export function ClaimableCardUnconfirmed({ tx }: { tx: MergedTransaction }) {
  const { l1, l2 } = useNetworksAndSigners()
  const { parentLayer, layer } = useChainLayers()

  let toNetworkId
  if (tx.isCctp) {
    toNetworkId = getTargetChainIdFromSourceChain(tx)
  } else {
    toNetworkId = tx.isWithdrawal ? l1.network.id : l2.network.id
  }

  const networkName = getNetworkName(toNetworkId)
  const { isEthereum: isWithdrawal } = isNetwork(toNetworkId)

  const isOrbitChainSelected = isNetwork(l2.network.id).isOrbitChain

  const tokenSymbol = useMemo(
    () =>
      sanitizeTokenSymbol(tx.asset, {
        erc20L1Address: tx.tokenAddress,
        chain: isWithdrawal ? l2.network : l1.network
      }),
    [tx.asset, tx.tokenAddress, isWithdrawal, l1.network, l2.network]
  )

  const { remainingTime } = useRemainingTime(tx)

  if (isOrbitChainSelected && tx.isCctp) {
    return null
  }

  return (
    <WithdrawalCardContainer tx={tx}>
      <div className="flex flex-row flex-wrap items-center justify-between">
        <div className="flex flex-col lg:ml-[-2rem]">
          <span className="ml-8 text-lg text-ocl-blue lg:ml-0 lg:text-2xl">
            Moving {formatAmount(Number(tx.value), { symbol: tokenSymbol })} to{' '}
            {networkName}
          </span>

          <div className="h-2" />
          <div className="flex flex-col font-light">
            {isWithdrawal ? (
              <>
                <span className="flex flex-nowrap gap-1 text-sm text-ocl-blue lg:text-base">
                  {layer} transaction: <WithdrawalL2TxStatus tx={tx} />
                </span>
                <span className="flex flex-nowrap gap-1 text-sm text-ocl-blue lg:text-base">
                  {parentLayer} transaction:{' '}
                  {tx.status === 'Failure'
                    ? 'Failed'
                    : 'Will show after claiming'}
                </span>
              </>
            ) : (
              <>
                <span className="flex flex-nowrap gap-1 text-sm text-ocl-blue lg:text-base">
                  {parentLayer} transaction: <WithdrawalL1TxStatus tx={tx} />
                </span>
                <span className="flex flex-nowrap gap-1 text-sm text-ocl-blue lg:text-base">
                  {layer} transaction:{' '}
                  {tx.status === 'Failure'
                    ? 'Failed'
                    : 'Will show after claiming'}
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

        <span className="absolute bottom-0 right-0 max-w-[100px] animate-pulse overflow-hidden text-ellipsis rounded-full bg-orange p-2 px-4 text-sm font-semibold text-ocl-blue lg:max-w-full lg:text-lg">
          <span className="whitespace-nowrap">
            {tx.nodeBlockDeadline ? (
              <WithdrawalCountdown nodeBlockDeadline={tx.nodeBlockDeadline} />
            ) : tx.isCctp ? (
              <>{remainingTime}</>
            ) : (
              <span>Calculating...</span>
            )}
          </span>
        </span>
      </div>
    </WithdrawalCardContainer>
  )
}
