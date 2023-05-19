import { useSwitchNetwork } from 'wagmi'
import { SwitchNetworkArgs } from '@wagmi/core'
import * as Sentry from '@sentry/react'

import { getNetworkName, isNetwork } from '../util/networks'
import { isUserRejectedError } from '../util/isUserRejectedError'

type SwitchNetworkConfig = {
  isSwitchingNetworkBeforeTx?: boolean
}

const handleSwitchNetworkNotSupported = (
  attemptedChainId: number,
  isSwitchingNetworkBeforeTx: boolean
) => {
  const isDeposit = isNetwork(attemptedChainId).isEthereum
  const targetTxName = isDeposit ? 'deposit' : 'withdraw'
  const networkName = getNetworkName(attemptedChainId)

  const message = isSwitchingNetworkBeforeTx
    ? `Please connect to ${networkName} on your wallet before signing your ${targetTxName} transaction.`
    : `Please connect to ${networkName} on your wallet.`

  // TODO: show user a nice dialogue box instead of
  // eslint-disable-next-line no-alert
  alert(message)
}

/**
 * Function to invoke when an error is thrown while attempting to switch network.
 * https://wagmi.sh/react/hooks/useSwitchNetwork#onerror-optional
 * @param error
 * @param param1 - `{ chainId: number }`
 * @param context - default value `{ isSwitchingNetworkBeforeTx: false }`
 */
function handleSwitchNetworkError(
  error: any,
  { chainId }: SwitchNetworkArgs,
  context: unknown = { isSwitchingNetworkBeforeTx: false }
) {
  const { isSwitchingNetworkBeforeTx } = context as {
    isSwitchingNetworkBeforeTx: boolean
  }
  if (isUserRejectedError(error)) {
    return
  }
  if (error.name === 'SwitchChainNotSupportedError') {
    handleSwitchNetworkNotSupported(chainId, isSwitchingNetworkBeforeTx)
  } else {
    Sentry.captureException(error)
  }
}

/**
 * The return value will be the `context` param received by the error
 * handler of `switchNetwork`.
 *
 * Function fires before switch network function and is passed same
 * variables switch network function would receive.
 * Value returned from this function will be passed to both `onError` and
 * `onSettled` functions in event of a switch network failure.
 * https://wagmi.sh/react/hooks/useSwitchNetwork#onmutate-optional
 *
 * @returns `{ isSwitchingNetworkBeforeTx: boolean }`
 */
function handleSwitchNetworkOnMutate({
  isSwitchingNetworkBeforeTx
}: {
  isSwitchingNetworkBeforeTx: boolean
}) {
  return {
    isSwitchingNetworkBeforeTx
  }
}

export function useSwitchNetworkWithConfig({
  isSwitchingNetworkBeforeTx = false
}: SwitchNetworkConfig = {}) {
  const config = {
    throwForSwitchChainNotSupported: true,
    onMutate: () => handleSwitchNetworkOnMutate({ isSwitchingNetworkBeforeTx }),
    onError: handleSwitchNetworkError
  }

  return useSwitchNetwork(config)
}
