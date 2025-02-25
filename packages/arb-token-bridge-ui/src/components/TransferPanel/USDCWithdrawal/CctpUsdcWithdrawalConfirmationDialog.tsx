import { useState } from 'react'
import { useNetworks } from '../../../hooks/useNetworks'
import { useNetworksRelationship } from '../../../hooks/useNetworksRelationship'
import { CctpTabContent } from '../CctpTabContent'
import { USDCWithdrawalConfirmationDialogCheckbox } from './UsdcWithdrawalConfirmationDialogCheckbox'
import { getNetworkName } from '../../../util/networks'
import { SecurityNotGuaranteed } from '../SecurityLabels'
import { Dialog, UseDialogProps } from '../../common/Dialog'
import { trackEvent } from '../../../util/AnalyticsUtils'
import { SpecialTokenSymbol } from '../../../util/fastBridges'

export function CctpUsdcWithdrawalConfirmationDialog(props: UseDialogProps) {
  const [networks] = useNetworks()
  const { parentChain } = useNetworksRelationship(networks)
  const [allCheckboxesChecked, setAllCheckboxesChecked] = useState(false)
  const destinationNetworkName = getNetworkName(parentChain.id)

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
            type: 'Withdrawal'
          })
        }
      }}
    >
      <div className="flex flex-col space-y-4 py-4">
        <div className="flex flex-col space-y-4">
          <CctpTabContent destinationChainId={parentChain.id}>
            <div className="flex flex-col space-y-4">
              <USDCWithdrawalConfirmationDialogCheckbox
                onAllCheckboxesCheched={() => {
                  setAllCheckboxesChecked(true)
                }}
                onChange={checked => {
                  if (!checked) {
                    setAllCheckboxesChecked(false)
                  }
                }}
              />
            </div>
          </CctpTabContent>
          <SecurityNotGuaranteed />
        </div>
      </div>
    </Dialog>
  )
}
