import { useSwitchNetwork } from 'wagmi'
import { SwitchNetworkArgs } from '@wagmi/core'
import * as Sentry from '@sentry/react'

import { getNetworkName, isNetwork } from '../util/networks'
import { isUserRejectedError } from '../util/isUserRejectedError'
import { warningToast } from '../components/common/atoms/Toast'

type SwitchNetworkConfig = {
  isSwitchingNetworkBeforeTx?: boolean
}

const handleSwitchNetworkNotSupported = (
  attemptedChainId: number,
  isSwitchingNetworkBeforeTx: boolean
) => {
  const isDeposit = isNetwork(attemptedChainId).isEthereumMainnetOrTestnet
  const targetTxName = isDeposit ? 'deposit' : 'withdraw'
  const networkName = getNetworkName(attemptedChainId)

  const message = isSwitchingNetworkBeforeTx
    ? `Please connect to ${networkName} on your wallet before signing your ${targetTxName} transaction.`
    : `Please connect to ${networkName} on your wallet.`

  warningToast(message)
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

export function useSwitchNetworkWithConfig({
  isSwitchingNetworkBeforeTx = false
}: SwitchNetworkConfig = {}) {
  const config = {
    throwForSwitchChainNotSupported: true,
    /**
     * onMutate:
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
    onMutate: () => ({ isSwitchingNetworkBeforeTx }),
    onError: handleSwitchNetworkError
  }

  return useSwitchNetwork(config)
}
