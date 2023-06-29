import { GET_HELP_LINK } from '../../constants'
import { ExternalLink } from './ExternalLink'

export function WalletConnectWarning() {
  return (
    <div className="m-3 max-w-md self-end rounded-md bg-cyan px-3 py-2 text-sm text-cyan-dark">
      Users connecting to the site using WalletConnect may experience errors due
      to their new upgrade. Please{' '}
      <ExternalLink
        className=" underline hover:no-underline"
        href={GET_HELP_LINK}
      >
        contact support
      </ExternalLink>{' '}
      if you have any issues.
    </div>
  )
}
