import { useMemo } from 'react'
import { twMerge } from 'tailwind-merge'

import { getNetworkName, isNetwork } from '../../util/networks'
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
import { useNetworks } from '../../hooks/useNetworks'
import { useNetworksRelationship } from '../../hooks/useNetworksRelationship'

export function ClaimableCardUnconfirmed({ tx }: { tx: MergedTransaction }) {
  const [networks] = useNetworks()
  const { childChain, parentChain } = useNetworksRelationship(networks)
  const { parentLayer, layer } = useChainLayers()

  let toNetworkId
  if (tx.isCctp) {
    toNetworkId = getTargetChainIdFromSourceChain(tx)
  } else {
    toNetworkId = tx.isWithdrawal ? parentChain.id : childChain.id
  }

  const networkName = getNetworkName(toNetworkId)

  const isOrbitChainSelected = isNetwork(childChain.id).isOrbitChain

  const tokenSymbol = useMemo(
    () =>
      sanitizeTokenSymbol(tx.asset, {
        erc20L1Address: tx.tokenAddress,
        chainId: tx.isWithdrawal ? childChain.id : parentChain.id
      }),

    [tx.asset, tx.tokenAddress, tx.isWithdrawal, childChain.id, parentChain.id]
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
            {tx.isWithdrawal ? (
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

        <span
          className={twMerge(
            'bottom-0 right-0 mt-2 w-full animate-pulse overflow-hidden text-ellipsis rounded-full bg-orange p-2 px-4 text-center text-sm font-semibold text-ocl-blue',
            'md:absolute md:mt-2 md:w-auto md:text-lg'
          )}
        >
          <span className="whitespace-nowrap">
            {tx.isCctp ? (
              <>{remainingTime}</>
            ) : (
              <WithdrawalCountdown createdAt={tx.createdAt} />
            )}
          </span>
        </span>
      </div>
    </WithdrawalCardContainer>
  )
}
