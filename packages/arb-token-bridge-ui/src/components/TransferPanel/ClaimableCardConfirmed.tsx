import { useCallback, useMemo, useState } from 'react'
import * as Sentry from '@sentry/react'

import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import { DepositStatus, MergedTransaction } from '../../state/app/state'
import {
  WithdrawalCardContainer,
  WithdrawalL1TxStatus,
  WithdrawalL2TxStatus
} from './WithdrawalCard'
import { useClaimWithdrawal } from '../../hooks/useClaimWithdrawal'
import { Button } from '../common/Button'
import { Tooltip } from '../common/Tooltip'
import { formatAmount } from '../../util/NumberUtils'
import {
  getStandardizedTimestamp,
  isCustomDestinationAddressTx
} from '../../state/app/utils'
import { sanitizeTokenSymbol } from '../../util/TokenUtils'
import { CustomAddressTxExplorer } from '../TransactionHistory/TransactionsTable/TransactionsTable'
import { useAccount, useChainId, useSigner } from 'wagmi'
import { useCCTP } from '../../hooks/CCTP/useCCTP'
import {
  getL1ChainIdFromSourceChain,
  useCctpState
} from '../../state/cctpState'
import { BigNumber } from 'ethers'
import { isNetwork } from '../../util/networks'

function useClaimCctp(tx: MergedTransaction) {
  const { address } = useAccount()
  const [isClaiming, setIsClaiming] = useState(false)
  const { waitForAttestation, receiveMessage } = useCCTP({
    sourceChainId: tx.cctpData?.sourceChainId
  })

  const { updatePendingTransfer } = useCctpState({
    l1ChainId: getL1ChainIdFromSourceChain(tx),
    walletAddress: address
  })
  const { data: signer } = useSigner()

  const claim = useCallback(async () => {
    if (!tx.cctpData?.attestationHash || !tx.cctpData.messageBytes || !signer) {
      console.log('a')
      return
    }

    setIsClaiming(true)
    try {
      const attestation = await waitForAttestation(tx.cctpData.attestationHash)
      const receiveTx = await receiveMessage({
        attestation,
        messageBytes: tx.cctpData.messageBytes as `0x${string}`,
        signer
      })
      const receiveReceiptTx = await receiveTx.wait()
      updatePendingTransfer({
        ...tx,
        resolvedAt: getStandardizedTimestamp(
          BigNumber.from(Date.now()).toString()
        ),
        status: 'Executed',
        depositStatus: DepositStatus.CCTP_DESTINATION_SUCCESS,
        cctpData: {
          ...tx.cctpData,
          receiveMessageTransactionHash:
            receiveReceiptTx.transactionHash as `0x${string}`
        }
      })
    } catch (e) {
      Sentry.captureException(e)
    } finally {
      setIsClaiming(false)
    }
  }, [receiveMessage, signer, tx, updatePendingTransfer, waitForAttestation])

  return {
    isClaiming,
    claim
  }
}

export function ClaimableCardConfirmed({
  tx,
  sourceNetwork
}: {
  tx: MergedTransaction
  sourceNetwork: 'L1' | 'L2'
}) {
  const { l1, l2 } = useNetworksAndSigners()
  const { claim, isClaiming } = useClaimWithdrawal()
  const { claim: claimCttp, isClaiming: isClaimingCctp } = useClaimCctp(tx)
  const chainId = useChainId()
  const { isMainnet, isGoerli, isArbitrumOne, isArbitrumGoerli } =
    isNetwork(chainId)
  const currentChainIsInvalid =
    (sourceNetwork === 'L1' && (isMainnet || isGoerli)) ||
    (sourceNetwork === 'L2' && (isArbitrumOne || isArbitrumGoerli))

  const isClaimButtonDisabled = useMemo(() => {
    return isClaiming || isClaimingCctp || currentChainIsInvalid
  }, [isClaiming, isClaimingCctp, currentChainIsInvalid])

  const tokenSymbol = useMemo(
    () =>
      sanitizeTokenSymbol(tx.asset, {
        erc20L1Address: tx.tokenAddress,
        chain: sourceNetwork === 'L1' ? l1.network : l2.network
      }),
    [tx, sourceNetwork, l1, l2]
  )

  return (
    <WithdrawalCardContainer tx={tx} sourceNetwork={sourceNetwork}>
      <div className="flex flex-row flex-wrap items-center justify-between">
        <div className="lg:-ml-8">
          {/* Heading */}
          <span className="ml-8 text-lg text-ocl-blue lg:ml-0 lg:text-2xl">
            Funds are ready to claim!
          </span>

          {/* Addresses */}
          <div className="h-2" />
          <div className="flex flex-col font-light">
            {sourceNetwork === 'L2' ? (
              <>
                <span className="flex flex-nowrap gap-1 text-sm text-ocl-blue lg:text-base">
                  L2 transaction: <WithdrawalL2TxStatus tx={tx} />
                </span>
                <span className="flex flex-nowrap gap-1 text-sm text-ocl-blue lg:text-base">
                  <>L1 transaction: Will show after claiming</>
                </span>
              </>
            ) : (
              <>
                <span className="flex flex-nowrap gap-1 text-sm text-ocl-blue lg:text-base">
                  L1 transaction: <WithdrawalL1TxStatus tx={tx} />
                </span>
                <span className="flex flex-nowrap gap-1 text-sm text-ocl-blue lg:text-base">
                  <>L2 transaction: Will show after claiming</>
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

        <Tooltip
          wrapperClassName=""
          show={currentChainIsInvalid}
          content={
            <span>
              Please connect to the {sourceNetwork === 'L2' ? 'L1' : 'L2'}{' '}
              network to claim your withdrawal.
            </span>
          }
        >
          <Button
            variant="primary"
            loading={isClaiming}
            disabled={isClaimButtonDisabled}
            onClick={() => {
              tx.isCctp ? claimCttp() : claim(tx)
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
      </div>
    </WithdrawalCardContainer>
  )
}
