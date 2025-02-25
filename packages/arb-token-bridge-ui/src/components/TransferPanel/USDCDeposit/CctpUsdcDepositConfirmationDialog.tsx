import { useState } from 'react'
import { useNetworks } from '../../../hooks/useNetworks'
import { useNetworksRelationship } from '../../../hooks/useNetworksRelationship'
import { Dialog, UseDialogProps } from '../../common/Dialog'
import { CctpTabContent } from '../CctpTabContent'
import { SecurityNotGuaranteed } from '../SecurityLabels'
import { USDCDepositConfirmationDialogCheckbox } from './UsdcDepositConfirmationDialogCheckbox'
import { getNetworkName } from '../../../util/networks'
import { trackEvent } from '../../../util/AnalyticsUtils'
import { SpecialTokenSymbol } from '../../../util/fastBridges'

export function CctpUsdcDepositConfirmationDialog(props: UseDialogProps) {
  const [networks] = useNetworks()
  const { childChain } = useNetworksRelationship(networks)
  const [allCheckboxesChecked, setAllCheckboxesChecked] = useState(false)
  const destinationNetworkName = getNetworkName(childChain.id)

  return (
    <Dialog
      {...props}
      title={`Move funds to ${destinationNetworkName}`}
      actionButtonProps={{
        disabled: !allCheckboxesChecked
      }}
      onClose={(confirmed: boolean) => {
        if (confirmed) {
          trackEvent('Use CCTP Click', {
            tokenSymbol: SpecialTokenSymbol.USDC,
            type: 'Deposit'
          })
        }
        props.onClose(confirmed)
      }}
    >
      <div className="flex flex-col space-y-4 py-4">
        <div className="flex flex-col space-y-4">
          <CctpTabContent destinationChainId={childChain.id}>
            <div className="flex flex-col space-y-4">
              <USDCDepositConfirmationDialogCheckbox
                onAllCheckboxesCheched={() => {
                  setAllCheckboxesChecked(true)
                }}
                onChange={checked => {
                  if (!checked) {
                    setAllCheckboxesChecked(false)
                  }
                }}
                isBridgingNativeUSDC
              />
            </div>
          </CctpTabContent>
          <SecurityNotGuaranteed />
        </div>
      </div>
    </Dialog>
  )
}
