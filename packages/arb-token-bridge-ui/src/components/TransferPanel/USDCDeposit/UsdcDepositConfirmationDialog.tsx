import { useState } from 'react'
import { useNetworks } from '../../../hooks/useNetworks'
import { useNetworksRelationship } from '../../../hooks/useNetworksRelationship'
import { Dialog, UseDialogProps } from '../../common/Dialog'
import { SecurityGuaranteed } from '../SecurityLabels'
import { USDCDepositConfirmationDialogCheckbox } from './UsdcDepositConfirmationDialogCheckbox'
import {
  getExplorerUrl,
  getNetworkName,
  isNetwork
} from '../../../util/networks'
import { trackEvent } from '../../../util/AnalyticsUtils'
import { SpecialTokenSymbol } from '../../../util/fastBridges'
import { ExternalLink } from '../../common/ExternalLink'
import { CommonAddress } from '../../../util/CommonAddressUtils'

export function UsdcDepositConfirmationDialog(props: UseDialogProps) {
  const [networks] = useNetworks()
  const { childChain, parentChain } = useNetworksRelationship(networks)
  const [allCheckboxesChecked, setAllCheckboxesChecked] = useState(false)
  const destinationNetworkName = getNetworkName(childChain.id)
  const usdceTokenDestinationAddress = isNetwork(parentChain.id).isTestnet
    ? CommonAddress.ArbitrumSepolia['USDC.e']
    : CommonAddress.ArbitrumOne['USDC.e']

  return (
    <Dialog
      {...props}
      title={`Move funds to ${destinationNetworkName}`}
      actionButtonProps={{
        disabled: !allCheckboxesChecked
      }}
      onClose={(confirmed: boolean) => {
        if (confirmed) {
          trackEvent('Use Arbitrum Bridge Click', {
            tokenSymbol: SpecialTokenSymbol.USDC,
            type: 'Deposit'
          })
        }
      }}
    >
      <div className="flex flex-col space-y-4 py-4">
        <div className="flex flex-col space-y-4">
          <p className="font-light">
            Receive{' '}
            <ExternalLink
              className="arb-hover underline"
              href={`${getExplorerUrl(
                childChain.id
              )}/token/${usdceTokenDestinationAddress}`}
            >
              Wrapped USDC (USDC.e)
            </ExternalLink>{' '}
            on {destinationNetworkName} using Arbitrum&apos;s native bridge.
          </p>

          <div className="flex flex-col space-y-4">
            <USDCDepositConfirmationDialogCheckbox
              onChange={checked => {
                setAllCheckboxesChecked(checked)
              }}
            />
          </div>
        </div>
        <SecurityGuaranteed />
      </div>
    </Dialog>
  )
}
