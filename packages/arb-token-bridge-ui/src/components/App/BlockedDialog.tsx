import { Tooltip } from '../common/Tooltip'
import { Dialog, DialogProps } from '../common/Dialog'
import { ExternalLink } from '../common/ExternalLink'
import { GET_HELP_LINK } from '../../constants'

export function BlockedDialog(props: DialogProps & { address: string }) {
  return (
    <Dialog
      {...props}
      title="This wallet address is blocked"
      isFooterHidden={true}
    >
      <div className="flex flex-col space-y-4 break-words py-4">
        <span>
          This{' '}
          <Tooltip
            wrapperClassName="inline font-medium"
            content={props.address.toLowerCase()}
          >
            address
          </Tooltip>{' '}
          is affiliated with a blocked activity.
        </span>
        <span>
          If you think this was an error, you can request a review by filing a{' '}
          <ExternalLink href={GET_HELP_LINK} className="arb-hover underline">
            support ticket
          </ExternalLink>
          .
        </span>
      </div>
    </Dialog>
  )
}
