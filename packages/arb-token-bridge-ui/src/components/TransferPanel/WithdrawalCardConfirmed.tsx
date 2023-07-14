import { useMemo } from 'react'

import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import { MergedTransaction } from '../../state/app/state'
import { WithdrawalCardContainer, WithdrawalL2TxStatus } from './WithdrawalCard'
import { useClaimWithdrawal } from '../../hooks/useClaimWithdrawal'
import { Button } from '../common/Button'
import { Tooltip } from '../common/Tooltip'
import { formatAmount } from '../../util/NumberUtils'
import { useIsConnectedToArbitrum } from '../../hooks/useIsConnectedToArbitrum'
import { isCustomAddressTx } from '../../state/app/utils'
import { sanitizeTokenSymbol } from '../../util/TokenUtils'
import { CustomAddressTxExplorer } from '../TransactionHistory/TransactionsTable/TransactionsTable'

export function WithdrawalCardConfirmed({ tx }: { tx: MergedTransaction }) {
  const { l2 } = useNetworksAndSigners()
  const { claim, isClaiming } = useClaimWithdrawal()
  const isConnectedToArbitrum = useIsConnectedToArbitrum()

  const isClaimButtonDisabled = useMemo(
    () =>
      typeof isConnectedToArbitrum !== 'undefined'
        ? isConnectedToArbitrum
        : true,
    [isConnectedToArbitrum]
  )

  const tokenSymbol = useMemo(
    () =>
      sanitizeTokenSymbol(tx.asset, {
        erc20L1Address: tx.tokenAddress,
        chain: l2.network
      }),
    [tx, l2]
  )

  return (
    <WithdrawalCardContainer tx={tx}>
      <div className="flex flex-row flex-wrap items-center justify-between">
        <div className="lg:-ml-8">
          {/* Heading */}
          <span className="ml-8 text-lg text-ocl-blue lg:ml-0 lg:text-2xl">
            Funds are ready to claim!
          </span>

          {/* Addresses */}
          <div className="h-2" />
          <div className="flex flex-col font-light">
            <span className="flex flex-nowrap gap-1 text-sm text-ocl-blue lg:text-base">
              L2 transaction: <WithdrawalL2TxStatus tx={tx} />
            </span>
            <span className="flex flex-nowrap gap-1 text-sm text-ocl-blue lg:text-base">
              L1 transaction: Will show after claiming
            </span>
            {isCustomAddressTx(tx) && (
              <span className="flex mt-2 flex-nowrap gap-1 text-sm text-gray-dark lg:text-base">
                <CustomAddressTxExplorer
                  tx={tx}
                  explorerClassName="arb-hover text-blue-link"
                />
              </span>
            )}
          </div>
        </div>

        <Tooltip
          wrapperClassName=""
          show={isClaimButtonDisabled}
          content={
            <span>
              Please connect to the L1 network to claim your withdrawal.
            </span>
          }
        >
          <Button
            variant="primary"
            loading={isClaiming}
            disabled={isClaimButtonDisabled}
            onClick={() => claim(tx)}
            className="absolute bottom-0 right-0 flex flex-nowrap text-sm lg:my-4 lg:text-lg"
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
