import React, { PropsWithChildren, useEffect, useState } from 'react'
import Image from 'next/image'
import { useAccount, useBlockNumber, useChainId, useSigner } from 'wagmi'
import * as Sentry from '@sentry/react'

import { ExternalLink } from '../common/ExternalLink'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import { shortenTxHash } from '../../util/CommonUtils'
import { trackEvent } from '../../util/AnalyticsUtils'

import { useAppContextActions, useAppContextState } from '../App/AppContext'
import {
  ChainId,
  getBlockTime,
  getExplorerUrl,
  getNetworkLogo,
  getNetworkName
} from '../../util/networks'
import { CheckCircleIcon } from '@heroicons/react/24/outline'
import { formatAmount } from '../../util/NumberUtils'
import { CustomAddressTxExplorer } from '../TransactionHistory/TransactionsTable/TransactionsTable'
import { CCTPSupportedChainId, useCCTP } from '../../hooks/CCTP/useCCTP'
import { Tooltip } from '../common/Tooltip'
import { Button } from '../common/Button'
import dayjs from 'dayjs'
import { PendingTransfer, useCctpState } from '../../state/cctpState'
import { isCustomDestinationAddressTx } from '../../state/app/utils'
import { errorToast } from '../common/atoms/Toast'

function ExplorerLink({
  txHash,
  networkId
}: {
  txHash: `0x${string}`
  networkId: ChainId
}) {
  return (
    <ExternalLink
      href={`${getExplorerUrl(networkId)}/tx/${txHash}`}
      className="arb-hover flex flex-nowrap items-center gap-1 text-blue-link"
    >
      {shortenTxHash(txHash)}
      <CheckCircleIcon className="h-4 w-4 text-lime-dark" />
    </ExternalLink>
  )
}

function L1TxStatus({ tx }: { tx: PendingTransfer }) {
  const { l1 } = useNetworksAndSigners()

  if (tx.direction === 'withdrawal') {
    return <>Will show after claiming</>
  }

  return (
    <ExplorerLink
      txHash={tx.source.transactionHash}
      networkId={l1.network.id}
    />
  )
}

function L2TxStatus({ tx }: { tx: PendingTransfer }) {
  const { l2 } = useNetworksAndSigners()

  if (tx.direction === 'deposit') {
    return <>Will show after claiming</>
  }

  return (
    <ExplorerLink
      txHash={tx.source.transactionHash}
      networkId={l2.network.id}
    />
  )
}

export function CctpCardContainer({
  tx,
  children
}: PropsWithChildren<{ tx: PendingTransfer }>) {
  const { closeTransactionHistoryPanel } = useAppContextActions()
  const {
    layout: { isTransferPanelVisible }
  } = useAppContextState()

  return (
    <div
      className={
        'box-border w-full overflow-hidden rounded-xl border-4 border-eth-dark bg-white p-4'
      }
    >
      <div className="relative flex flex-col items-center gap-6 lg:flex-row">
        {/* Logo watermark */}
        <Image
          src={getNetworkLogo(
            tx.direction === 'deposit' ? ChainId.ArbitrumOne : ChainId.Mainnet
          )}
          className="absolute left-0 top-[1px] z-10 mr-4 h-8 max-h-[90px] w-auto p-[2px] lg:relative lg:left-[-30px] lg:top-0 lg:h-[4.5rem] lg:w-[initial] lg:max-w-[90px] lg:translate-x-[0.5rem] lg:scale-[1.5] lg:opacity-[60%]"
          alt="Withdrawal"
          width={90}
          height={90}
        />
        {/* Actual content */}
        <div className="z-20 w-full">{children}</div>
      </div>

      {!isTransferPanelVisible && (
        <button
          className="arb-hover absolute bottom-4 right-4 text-ocl-blue underline"
          onClick={() => {
            trackEvent('Move More Funds Click')
            closeTransactionHistoryPanel()
          }}
        >
          Move more funds
        </button>
      )}
    </div>
  )
}

// see https://developers.circle.com/stablecoin/docs/cctp-technical-reference#block-confirmations-for-attestations
function getBlockBeforeConfirmation(chainId: CCTPSupportedChainId) {
  return {
    [ChainId.Mainnet]: 65,
    [ChainId.ArbitrumOne]: 65,
    [ChainId.Goerli]: 5,
    [ChainId.ArbitrumGoerli]: 5
  }[chainId]
}

export function CctpCardUnconfirmed({ tx }: { tx: PendingTransfer }) {
  const [isClaiming, setIsClaiming] = useState(false)
  const { l1, l2 } = useNetworksAndSigners()
  const networkName = getNetworkName(
    tx.direction === 'deposit' ? l2.network.id : l1.network.id
  )
  const chainId = useChainId()

  const [isReady, setIsReady] = useState(false)
  const [countdown, setCountdown] = useState<number>(13 * 60) // 13 minutes
  const blocksBeforeConfirmation = getBlockBeforeConfirmation(tx.source.chainId)
  const { data: blockNumber } = useBlockNumber({
    chainId: tx.source.chainId,
    watch: true,
    enabled: !isReady
  })

  useEffect(() => {
    if (!blockNumber) {
      return
    }
    const elapsedBlocks = blockNumber - tx.source.blockNum
    if (elapsedBlocks > blocksBeforeConfirmation) {
      setIsReady(true)
    }
    const blockTime =
      tx.direction === 'deposit' ? getBlockTime(tx.source.chainId) : 15

    setCountdown(
      Math.max(blocksBeforeConfirmation - elapsedBlocks, 0) * blockTime
    )
  }, [
    blockNumber,
    blocksBeforeConfirmation,
    tx.direction,
    tx.source.blockNum,
    tx.source.chainId
  ])

  const { waitForAttestation, receiveMessage } = useCCTP({
    sourceChainId: tx.source.chainId
  })
  const { data: signer } = useSigner()
  const { address } = useAccount()
  const { completePendingTransfer } = useCctpState({
    l1ChainId: l1.network.id,
    walletAddress: address
  })

  const withdrawalDate = dayjs().add(countdown, 'second')
  const remainingTime = dayjs().to(withdrawalDate, true)

  return (
    <CctpCardContainer tx={tx}>
      <div className="flex flex-row flex-wrap items-center justify-between">
        <div className="flex flex-col lg:ml-[-2rem]">
          <span className="ml-8 text-lg text-ocl-blue lg:ml-0 lg:text-2xl">
            Moving {formatAmount(tx.amount, { decimals: 6, symbol: 'USDC' })} to{' '}
            {networkName}
          </span>

          <span className="animate-pulse text-sm text-gray-dark">
            <span className="whitespace-nowrap">
              {countdown > 0 ? remainingTime : null}
            </span>
          </span>

          <div className="h-2" />
          <div className="flex flex-col font-light">
            <span className="flex flex-nowrap gap-1 text-sm text-ocl-blue lg:text-base">
              L2 transaction: <L2TxStatus tx={tx} />
            </span>
            <span className="flex flex-nowrap gap-1 text-sm text-ocl-blue lg:text-base">
              L1 transaction: <L1TxStatus tx={tx} />
            </span>
            {isCustomDestinationAddressTx({
              sender: tx.sender,
              destination: tx.recipient
            }) && (
              <span className="mt-2 flex flex-nowrap gap-1 text-sm text-gray-dark lg:text-base">
                <CustomAddressTxExplorer
                  tx={{
                    isWithdrawal: tx.direction === 'withdrawal',
                    sender: tx.sender,
                    destination: tx.recipient
                  }}
                  explorerClassName="arb-hover text-blue-link"
                />
              </span>
            )}
          </div>
        </div>

        <Tooltip
          content={
            isReady ? (
              <span>
                Please connect to the L1 network to claim your withdrawal.
              </span>
            ) : (
              <span>Funds aren&apos;t ready to claim yet</span>
            )
          }
          show={!isReady || chainId !== tx.destination.chainId}
        >
          <Button
            variant="primary"
            className="absolute bottom-0 right-0 text-sm lg:my-4 lg:text-lg"
            disabled={!isReady || chainId !== tx.destination.chainId}
            loading={isClaiming}
            onClick={async () => {
              if (!signer) {
                return
              }
              setIsClaiming(true)
              try {
                const attestation = await waitForAttestation(tx.attestationHash)
                const receiveTx = await receiveMessage({
                  attestation,
                  messageBytes: tx.messageBytes as `0x${string}`,
                  signer
                })
                const receiveReceipt = await receiveTx.wait()
                completePendingTransfer(
                  tx,
                  Date.now(),
                  receiveReceipt.transactionHash
                )
              } catch (e) {
                errorToast(`Failed to claim USDC on ${networkName}`)
                Sentry.captureException(e)
              } finally {
                setIsClaiming(false)
              }
            }}
          >
            <div className="flex flex-nowrap whitespace-pre">
              Claim{' '}
              <span className="hidden lg:flex">
                {formatAmount(tx.amount, {
                  decimals: 6,
                  symbol: 'USDC'
                })}
              </span>
            </div>
          </Button>
        </Tooltip>
      </div>
    </CctpCardContainer>
  )
}
