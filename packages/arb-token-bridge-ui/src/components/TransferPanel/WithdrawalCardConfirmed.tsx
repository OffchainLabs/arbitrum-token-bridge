import { useMemo } from 'react'

import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import { MergedTransaction } from '../../state/app/state'
import { WithdrawalCardContainer, WithdrawalL2TxStatus } from './WithdrawalCard'
import { useClaimWithdrawal } from '../../hooks/useClaimWithdrawal'
import { useSwitchNetworkWithConfig } from '../../hooks/useSwitchNetworkWithConfig'
import { Button } from '../common/Button'
import { formatAmount } from '../../util/NumberUtils'
import { useIsConnectedToArbitrum } from '../../hooks/useIsConnectedToArbitrum'
import { sanitizeTokenSymbol } from '../../util/TokenUtils'
import { getNetworkName } from '../../util/networks'

export function WithdrawalCardConfirmed({ tx }: { tx: MergedTransaction }) {
  const { l1, l2 } = useNetworksAndSigners()
  const { claim, isClaiming } = useClaimWithdrawal()
  const isConnectedToArbitrum = useIsConnectedToArbitrum()
  const { switchNetwork } = useSwitchNetworkWithConfig()

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

  function handleClaimClick() {
    if (isConnectedToArbitrum) {
      switchNetwork?.(l1.network.id)
    } else {
      claim(tx)
    }
  }

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
          </div>
        </div>

        {isConnectedToArbitrum && (
          <div className="absolute -bottom-4 left-0 text-xs text-brick-dark sm:left-auto sm:right-2 sm:top-0">
            <b>Ready to claim.</b> Switch to {getNetworkName(l1.network.id)} to
            claim.
          </div>
        )}

        <Button
          variant="primary"
          loading={isClaiming}
          onClick={handleClaimClick}
          className="absolute bottom-3 right-0 flex flex-nowrap text-sm lg:bottom-0 lg:my-4 lg:text-lg"
        >
          <div className="flex flex-nowrap whitespace-pre">
            {isConnectedToArbitrum ? (
              <>
                <span className="sm:hidden">Switch</span>
                <span className="hidden sm:inline">
                  Switch network to claim
                </span>
              </>
            ) : (
              <>
                Claim{' '}
                <span className="hidden lg:flex">
                  {formatAmount(Number(tx.value), {
                    symbol: tokenSymbol
                  })}
                </span>
              </>
            )}
          </div>
        </Button>
      </div>
    </WithdrawalCardContainer>
  )
}
