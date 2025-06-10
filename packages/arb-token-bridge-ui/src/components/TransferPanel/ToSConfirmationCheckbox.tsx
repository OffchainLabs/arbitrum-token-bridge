import { useAccount } from 'wagmi'
import { useLocalStorage } from '@uidotdev/usehooks'
import { twMerge } from 'tailwind-merge'
import { useLatest } from 'react-use'
import { Checkbox } from '../common/Checkbox'
import { TOS_LOCALSTORAGE_KEY } from '../../constants'
import { ExternalLink } from '../common/ExternalLink'
import { useAmountBigNumber } from '../TransferPanel/hooks/useAmountBigNumber'

export function ToSConfirmationCheckbox({ className }: { className?: string }) {
  const [tosAccepted, setTosAccepted] = useLocalStorage<boolean>(
    TOS_LOCALSTORAGE_KEY,
    false
  )

  const { isConnected } = useAccount()
  const { current: amountBigNumber } = useLatest(useAmountBigNumber())

  /**
   * Visual states for the ToS checkbox:
   * 1. Not accepted: Full opacity (100%)
   * 2. Not accepted + Amount entered + Wallet connected: Animated highlight to draw attention
   * 3. Accepted: Reduced opacity (50%) to de-emphasize
   */
  const shouldHighlightWithAnimation =
    !tosAccepted && amountBigNumber.gt(0) && isConnected

  return (
    <div
      className={twMerge(
        tosAccepted ? 'opacity-50' : 'opacity-100',
        shouldHighlightWithAnimation ? 'animate-blinkInfinite' : '',
        className // overrides from the parent
      )}
    >
      <Checkbox
        label={
          <span className="text-sm">
            I have read, and agree to the{' '}
            <ExternalLink
              href="https://arbitrum.io/tos"
              className="arb-hover cursor-pointer underline"
              onClick={event => {
                event.stopPropagation()
                event.preventDefault()
                window.open('https://arbitrum.io/tos', '_blank')
              }}
            >
              Terms and Conditions
            </ExternalLink>
            .
          </span>
        }
        checked={tosAccepted}
        onChange={setTosAccepted}
      />
    </div>
  )
}
