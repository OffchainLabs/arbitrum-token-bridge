import { useCallback } from 'react'
import { useAccount } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'

import { GET_HELP_LINK } from '../../constants'
import { useClaimWithdrawal } from '../../hooks/useClaimWithdrawal'
import { useClaimCctp } from '../../state/cctpState'
import {
  DepositStatus,
  MergedTransaction,
  TeleporterMergedTransaction
} from '../../state/app/state'
import { trackEvent } from '../../util/AnalyticsUtils'
import { isUserRejectedError } from '../../util/isUserRejectedError'
import { getNetworkName } from '../../util/networks'
import { errorToast } from '../common/atoms/Toast'
import { Button } from '../common/Button'
import { useSwitchNetworkWithConfig } from '../../hooks/useSwitchNetworkWithConfig'
import { isDepositReadyToRedeem } from '../../state/app/utils'
import { useRedeemRetryable } from '../../hooks/useRedeemRetryable'
import { TransferCountdown } from '../common/TransferCountdown'
import { getChainIdForRedeemingRetryable } from '../../util/RetryableUtils'
import { isTeleportTx } from '../../types/Transactions'
import { useRedeemTeleporter } from '../../hooks/useRedeemTeleporter'
import { sanitizeTokenSymbol } from '../../util/TokenUtils'
import { formatAmount } from '../../util/NumberUtils'
import { useTransactionHistoryAddressStore } from './TransactionHistorySearchBar'
import { Tooltip } from '../common/Tooltip'
import { addressesEqual } from '../../util/AddressUtils'

function ActionRowConnectButton() {
  return (
    <ConnectButton.Custom>
      {({ openConnectModal }) => (
        <Button
          variant="primary"
          className="w-14 rounded bg-lime-dark p-2 text-xs text-white"
          onClick={openConnectModal}
        >
          Connect
        </Button>
      )}
    </ConnectButton.Custom>
  )
}

export function TransactionsTableRowAction({
  tx,
  isError,
  type
}: {
  tx: MergedTransaction | TeleporterMergedTransaction
  isError: boolean
  type: 'deposits' | 'withdrawals'
}) {
  const { address: connectedAddress, chain, isConnected } = useAccount()
  const { switchChainAsync } = useSwitchNetworkWithConfig()
  const networkName = getNetworkName(chain?.id ?? 0)
  const searchedAddress = useTransactionHistoryAddressStore(
    state => state.sanitizedAddress
  )

  const isViewingAnotherAddress =
    connectedAddress &&
    searchedAddress &&
    !addressesEqual(connectedAddress, searchedAddress)

  const tokenSymbol = sanitizeTokenSymbol(tx.asset, {
    erc20L1Address: tx.tokenAddress,
    chainId: tx.sourceChainId
  })

  const { claim, isClaiming } = useClaimWithdrawal(tx)
  const { claim: claimCctp, isClaiming: isClaimingCctp } = useClaimCctp(tx)
  const { redeem, isRedeeming: isRetryableRedeeming } = useRedeemRetryable(
    tx,
    searchedAddress
  )
  const { redeem: teleporterRedeem, isRedeeming: isTeleporterRedeeming } =
    useRedeemTeleporter(tx, searchedAddress)

  const isRedeeming = isRetryableRedeeming || isTeleporterRedeeming

  const chainIdForRedeemingRetryable = getChainIdForRedeemingRetryable(tx)

  const isConnectedToCorrectNetworkForAction = isDepositReadyToRedeem(tx)
    ? chain?.id === chainIdForRedeemingRetryable // for redemption actions, we can have different chain id
    : chain?.id === tx.destinationChainId // for claims, we need to be on the destination chain

  const handleRedeemRetryable = useCallback(async () => {
    try {
      if (!isConnectedToCorrectNetworkForAction) {
        await switchChainAsync({ chainId: chainIdForRedeemingRetryable })
      }

      if (isTeleportTx(tx)) {
        await teleporterRedeem()
      } else {
        await redeem()
      }
    } catch (error: any) {
      if (isUserRejectedError(error)) {
        return
      }
      errorToast(`Can't retry the deposit: ${error?.message ?? error}`)
    }
  }, [
    tx,
    isConnectedToCorrectNetworkForAction,
    chainIdForRedeemingRetryable,
    redeem,
    switchChainAsync,
    teleporterRedeem
  ])

  const handleClaim = useCallback(async () => {
    try {
      if (!isConnectedToCorrectNetworkForAction) {
        await switchChainAsync({ chainId: tx.destinationChainId })
      }

      if (tx.isCctp) {
        return await claimCctp()
      } else {
        return await claim()
      }
    } catch (error: any) {
      if (isUserRejectedError(error)) {
        return
      }

      errorToast(
        `Can't claim ${type === 'deposits' ? 'deposit' : 'withdrawal'}: ${
          error?.message ?? error
        }`
      )
    }
  }, [
    claim,
    claimCctp,
    isConnectedToCorrectNetworkForAction,
    switchChainAsync,
    tx,
    type
  ])

  const getHelpOnError = () => {
    window.open(GET_HELP_LINK, '_blank')

    // track the button click
    trackEvent('Tx Error: Get Help Click', { network: networkName })
  }

  if (isDepositReadyToRedeem(tx)) {
    if (!isConnected) {
      return <ActionRowConnectButton />
    }

    // Failed retryable
    return isRedeeming ? (
      <span className="animate-pulse">Retrying...</span>
    ) : (
      <Button
        aria-label="Retry transaction"
        variant="primary"
        onClick={handleRedeemRetryable}
        className="w-14 bg-red-400 p-2 text-xs text-black"
      >
        Retry
      </Button>
    )
  }

  if (
    tx.status === 'pending' ||
    tx.status === 'Unconfirmed' ||
    tx.depositStatus === DepositStatus.L1_PENDING ||
    tx.depositStatus === DepositStatus.L2_PENDING
  ) {
    return (
      <div className="flex flex-col text-center text-xs">
        <span>Time left:</span>
        <TransferCountdown tx={tx} />
      </div>
    )
  }

  if (tx.status === 'Confirmed') {
    if (tx.isCctp && tx.resolvedAt) {
      return null
    }

    if (!isConnected) {
      return <ActionRowConnectButton />
    }

    if (tx.isLifi) {
      return null
    }

    return isClaiming || isClaimingCctp ? (
      <span className="my-2 animate-pulse text-xs">Claiming...</span>
    ) : (
      <Tooltip
        content={
          <span>{`Funds will arrive at ${searchedAddress} on ${getNetworkName(
            tx.destinationChainId
          )} once the claim transaction succeeds.`}</span>
        }
        show={isViewingAnotherAddress}
      >
        <Button
          aria-label={`Claim ${formatAmount(Number(tx.value), {
            symbol: tokenSymbol
          })}`}
          variant="primary"
          className="w-14 rounded bg-green-400 p-2 text-xs text-black"
          onClick={handleClaim}
        >
          Claim
        </Button>
      </Tooltip>
    )
  }

  if (isError) {
    return (
      <Button
        variant="secondary"
        className="w-14 border-white/30 text-xs"
        onClick={getHelpOnError}
      >
        Get help
      </Button>
    )
  }

  return null
}
