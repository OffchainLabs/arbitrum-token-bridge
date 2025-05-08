import { useLocalStorage } from '@uidotdev/usehooks'
import { Checkbox } from '../common/Checkbox'
import { TOS_LOCALSTORAGE_KEY } from '../../constants'
import { ExternalLink } from '../common/ExternalLink'

export function WidgetTosConfirmationCheckbox() {
  const [tosAccepted, setTosAccepted] = useLocalStorage<boolean>(
    TOS_LOCALSTORAGE_KEY,
    false
  )

  return (
    <Checkbox
      label={
        <span className="text-sm text-white">
          I have read and am cool with the{' '}
          <ExternalLink
            href="https://arbitrum.io/tos"
            className="arb-hover underline"
          >
            Terms and Conditions
          </ExternalLink>
          .
        </span>
      }
      checked={tosAccepted}
      onChange={setTosAccepted}
    />
  )
}
