import { useState } from 'react'

import { useArbQueryParams } from '../../hooks/useArbQueryParams'
import { useNetworks } from '../../hooks/useNetworks'
import { shortenAddress } from '../../util/CommonUtils'
import { getExplorerUrl, getNetworkName } from '../../util/networks'
import { Checkbox } from '../common/Checkbox'
import { Dialog, UseDialogProps } from '../common/Dialog'
import { ExternalLink } from '../common/ExternalLink'

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
          You are attempting to deposit funds to the same address{' '}
          <ExternalLink
            className="arb-hover underline"
            href={`${getExplorerUrl(
              networks.destinationChain.id
            )}/address/${destinationAddress}`}
          >
            {shortenAddress(destinationAddress)}
          </ExternalLink>{' '}
          on {networkName}.
        </p>
        <p className="pb-2">
          This is an uncommon action since it&apos;s not guaranteed that you
          have a smart contract wallet at the same address on the destination
          chain.
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
        >
          <span className="font-medium">support channel</span>
        </ExternalLink>{' '}
        for assistance.
      </p>
    </Dialog>
  )
}
