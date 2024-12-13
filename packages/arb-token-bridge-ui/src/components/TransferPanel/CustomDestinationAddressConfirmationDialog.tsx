import { useState } from 'react'

import { Dialog, UseDialogProps } from '../common/Dialog'
import { ExternalLink } from '../common/ExternalLink'
import { useNetworks } from '../../hooks/useNetworks'
import { getNetworkName } from '../../util/networks'
import { shortenAddress } from '../../util/CommonUtils'
import { useArbQueryParams } from '../../hooks/useArbQueryParams'
import { Checkbox } from '../common/Checkbox'

export function CustomDestinationAddressConfirmationDialog(
  props: UseDialogProps
) {
  const [{ destinationAddress = '' }] = useArbQueryParams()

  const [networks] = useNetworks()

  const networkName = getNetworkName(networks.destinationChain.id)

  const [checkboxChecked, setCheckboxChecked] = useState(false)

  function closeWithReset(confirmed: boolean) {
    props.onClose(confirmed)
    setCheckboxChecked(false)
  }

  return (
    <Dialog
      {...props}
      title="Confirm Destination Address"
      className="flex flex-col gap-4"
      onClose={closeWithReset}
      actionButtonProps={{
        disabled: !checkboxChecked
      }}
    >
      <div className="mb-4">
        <p className="pb-2">
          You are attempting to deposit funds to a destination address (
          {shortenAddress(destinationAddress)}), which is the same as your
          connected wallet address.
          <br />
          This is an uncommon action. If this was a mistake, please update your
          destination address.
        </p>
      </div>

      <p className="mb-8 rounded-md bg-orange/10 p-4">
        <Checkbox
          label={
            <span className="font-light">
              I confirm that I have full control over the entered destination
              address on {networkName} and understand that proceeding without
              control may result in an{' '}
              <span className="font-bold">irrecoverable loss of funds</span>.
            </span>
          }
          checked={checkboxChecked}
          onChange={setCheckboxChecked}
        />
      </p>

      <p>
        If not sure, please reach out to us on our{' '}
        <ExternalLink
          className="arb-hover underline"
          href="https://discord.gg/ZpZuw7p"
          target="_blank"
          rel="noopener noreferrer"
        >
          <span className="font-medium">support channel</span>
        </ExternalLink>{' '}
        for assistance.
      </p>
    </Dialog>
  )
}
