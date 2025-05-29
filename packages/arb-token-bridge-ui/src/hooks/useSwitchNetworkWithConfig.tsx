import { SwitchChainParameters } from '@wagmi/core'
import { useSwitchChain } from 'wagmi'

import { warningToast } from '../components/common/atoms/Toast'
import { isUserRejectedError } from '../util/isUserRejectedError'
import { getNetworkName, isNetwork } from '../util/networks'
import { captureSentryErrorWithExtraData } from '../util/SentryUtils'

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
  { chainId }: SwitchChainParameters,
  context: unknown = { isSwitchingNetworkBeforeTx: false }
) {
  const { isSwitchingNetworkBeforeTx } = context as {
    isSwitchingNetworkBeforeTx: boolean
  }
  if (isUserRejectedError(error)) {
    return
  }
  if (
    error.name === 'SwitchChainNotSupportedError' ||
    error.name === 'AddChainError'
  ) {
    handleSwitchNetworkNotSupported(chainId, isSwitchingNetworkBeforeTx)
  } else {
    captureSentryErrorWithExtraData({
      error,
      originFunction: 'handleSwitchNetworkError'
    })
  }
}

export function useSwitchNetworkWithConfig({
  isSwitchingNetworkBeforeTx = false
}: SwitchNetworkConfig = {}) {
  return useSwitchChain({
    mutation: {
      /**
       * onMutate:
       * The return value will be the `context` param received by the error
       * handler of `switchChain`.
       *
       * Function fires before switch network function and is passed same
       * variables switch network function would receive.
       * Value returned from this function will be passed to both `onError` and
       * `onSettled` functions in event of a switch network failure.
       * https://wagmi.sh/react/api/hooks/useSwitchChain#onmutate
       *
       * @returns `{ isSwitchingNetworkBeforeTx: boolean }`
       */
      onMutate: () => ({ isSwitchingNetworkBeforeTx }),
      onError: handleSwitchNetworkError
    }
  })
}
