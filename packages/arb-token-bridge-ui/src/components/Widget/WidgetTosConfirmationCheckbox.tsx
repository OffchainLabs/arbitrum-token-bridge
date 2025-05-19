import { useLocalStorage } from '@uidotdev/usehooks'
import { Checkbox } from '../common/Checkbox'
import { TOS_LOCALSTORAGE_KEY } from '../../constants'
import { ExternalLink } from '../common/ExternalLink'
import { twMerge } from 'tailwind-merge'
import { useLatest } from 'react-use'
import { useAmountBigNumber } from '../TransferPanel/hooks/useAmountBigNumber'
import { useAccount } from 'wagmi'

export function WidgetTosConfirmationCheckbox() {
  const [tosAccepted, setTosAccepted] = useLocalStorage<boolean>(
    TOS_LOCALSTORAGE_KEY,
    false
  )
  const { isConnected } = useAccount()
  const { current: amountBigNumber } = useLatest(useAmountBigNumber())

  const isTosHighlighted = !tosAccepted && amountBigNumber.gt(0) && isConnected

  return (
    <div
      className={twMerge(
        isTosHighlighted ? 'animate-blinkInfinite' : 'opacity-30'
      )}
    >
      <Checkbox
        label={
          <span
            className="cursor-default text-sm"
            onClick={event => {
              event.preventDefault()
            }}
          >
            I have read, and agree to the{' '}
            <ExternalLink
              href="https://arbitrum.io/tos"
              className="arb-hover cursor-pointer underline"
              onClick={() => {
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
