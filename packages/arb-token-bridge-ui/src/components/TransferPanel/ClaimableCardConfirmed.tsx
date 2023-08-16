import { useMemo } from 'react'

import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import { MergedTransaction } from '../../state/app/state'
import {
  WithdrawalCardContainer,
  WithdrawalL1TxStatus,
  WithdrawalL2TxStatus
} from './WithdrawalCard'
import { useClaimWithdrawal } from '../../hooks/useClaimWithdrawal'
import { Button } from '../common/Button'
import { Tooltip } from '../common/Tooltip'
import { formatAmount } from '../../util/NumberUtils'
import { isCustomDestinationAddressTx } from '../../state/app/utils'
import { sanitizeTokenSymbol } from '../../util/TokenUtils'
import { CustomAddressTxExplorer } from '../TransactionHistory/TransactionsTable/TransactionsTable'
import { useChainId } from 'wagmi'

import { ChainId, getNetworkName, isNetwork } from '../../util/networks'
import {
  getTargetChainIdFromSourceChain,
  useClaimCctp
} from '../../state/cctpState'
import { isUserRejectedError } from '../../util/isUserRejectedError'
import { errorToast } from '../common/atoms/Toast'
import { GET_HELP_LINK } from '../../constants'
import { shouldTrackAnalytics, trackEvent } from '../../util/AnalyticsUtils'

export function ClaimableCardConfirmed({ tx }: { tx: MergedTransaction }) {
  const { l1, l2 } = useNetworksAndSigners()
  const { claim, isClaiming } = useClaimWithdrawal()
  const { claim: claimCctp, isClaiming: isClaimingCctp } = useClaimCctp(tx)
  const chainId = useChainId()
  const { isArbitrum, isEthereum } = isNetwork(chainId)
  const sourceChainId = tx.cctpData?.sourceChainId ?? ChainId.ArbitrumOne
  const {
    isEthereum: isSourceChainIdEthereum,
    isArbitrum: isSourceChainIdArbitrum
  } = isNetwork(sourceChainId)

  let toNetworkId
  if (tx.isCctp) {
    toNetworkId = getTargetChainIdFromSourceChain(tx)
  } else {
    toNetworkId = tx.isWithdrawal ? l1.network.id : l2.network.id
  }

  const networkName = getNetworkName(toNetworkId)

  const currentChainIsValid =
    (isSourceChainIdEthereum && isArbitrum) ||
    (isSourceChainIdArbitrum && isEthereum)

  const isClaimButtonDisabled = useMemo(() => {
    return !!(
      isClaiming ||
      isClaimingCctp ||
      !currentChainIsValid ||
      (tx.status === 'Confirmed' && tx.cctpData?.receiveMessageTimestamp)
    )
  }, [
    isClaiming,
    isClaimingCctp,
    currentChainIsValid,
    tx.status,
    tx.cctpData?.receiveMessageTimestamp
  ])

  const getHelpOnError = () => {
    window.open(GET_HELP_LINK, '_blank')

    // track the button click
    if (shouldTrackAnalytics(networkName)) {
      trackEvent('Tx Error: Get Help Click', { network: networkName })
    }
  }

  const tokenSymbol = useMemo(
    () =>
      sanitizeTokenSymbol(tx.asset, {
        erc20L1Address: tx.tokenAddress,
        chain: isSourceChainIdEthereum ? l1.network : l2.network
      }),
    [tx, isSourceChainIdEthereum, l1, l2]
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
            {isSourceChainIdEthereum ? (
              <>
                <span className="flex flex-nowrap gap-1 text-sm text-ocl-blue lg:text-base">
                  L1 transaction: <WithdrawalL1TxStatus tx={tx} />
                </span>
                <span className="flex flex-nowrap gap-1 text-sm text-ocl-blue lg:text-base">
                  <>L2 transaction: Will show after claiming</>
                </span>
              </>
            ) : (
              <>
                <span className="flex flex-nowrap gap-1 text-sm text-ocl-blue lg:text-base">
                  L2 transaction: <WithdrawalL2TxStatus tx={tx} />
                </span>
                <span className="flex flex-nowrap gap-1 text-sm text-ocl-blue lg:text-base">
                  <>L1 transaction: Will show after claiming</>
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

        {tx.status !== 'Failure' ? (
          <Tooltip
            wrapperClassName=""
            show={!currentChainIsValid}
            content={
              <span>
                Please connect to the {isSourceChainIdEthereum ? 'L2' : 'L1'}{' '}
                network to claim your{' '}
                {isSourceChainIdEthereum ? 'withdrawal' : 'deposit'}.
              </span>
            }
          >
            <Button
              variant="primary"
              loading={isClaiming || isClaimingCctp}
              disabled={isClaimButtonDisabled}
              onClick={async () => {
                try {
                  if (tx.isCctp) {
                    await claimCctp()
                  } else {
                    await claim(tx)
                  }
                } catch (error: any) {
                  if (isUserRejectedError(error)) {
                    return
                  }

                  errorToast(
                    `Can't claim ${
                      isSourceChainIdEthereum ? 'withdrawal' : 'deposit'
                    }: ${error?.message ?? error}`
                  )
                }
              }}
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
        ) : (
          <Button variant="primary" onClick={getHelpOnError}>
            Get Help
          </Button>
        )}
      </div>
    </WithdrawalCardContainer>
  )
}
