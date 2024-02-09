import { useEffect, useState } from 'react'

import { Tab, Dialog as HeadlessUIDialog } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'

import { Dialog, UseDialogProps } from '../../common/Dialog'
import { Button } from '../../common/Button'
import { ExternalLink } from '../../common/ExternalLink'
import {
  SpecialTokenSymbol,
  USDCFastBridges,
  FastBridgeInfo
} from '../../../util/fastBridges'
import { TabButton } from '../../common/Tab'
import { BridgesTable } from '../../common/BridgesTable'
import { getNetworkName, isNetwork } from '../../../util/networks'
import { CommonAddress } from '../../../util/CommonAddressUtils'
import { USDCWithdrawalConfirmationDialogCheckbox } from './USDCWithdrawalConfirmationDialogCheckbox'
import { CctpTabContent } from '../CctpTabContent'
import { CCTP_DOCUMENTATION } from '../../../constants'
import { useNetworks } from '../../../hooks/useNetworks'
import { useNetworksRelationship } from '../../../hooks/useNetworksRelationship'
import { trackEvent } from '../../../util/AnalyticsUtils'

enum SelectedTabName {
  ThirdParty = 'third_party',
  Cctp = 'cctp'
}

export function USDCWithdrawalConfirmationDialog(
  props: UseDialogProps & { amount: string }
) {
  const [networks] = useNetworks()
  const { childChain, parentChain } = useNetworksRelationship(networks)

  const [allCheckboxesCheched, setAllCheckboxesChecked] = useState(false)
  const [selectedTabName, setSelectedTabName] = useState<SelectedTabName>(
    SelectedTabName.ThirdParty
  )
  const { isArbitrumSepolia } = isNetwork(childChain.id)
  const destinationNetworkName = getNetworkName(parentChain.id)
  const tokenSymbol = SpecialTokenSymbol.USDC

  useEffect(() => {
    setAllCheckboxesChecked(false)
  }, [props.isOpen])

  const fastBridges: FastBridgeInfo[] = USDCFastBridges.map(USDCFastBridge => ({
    name: USDCFastBridge.name,
    imageSrc: USDCFastBridge.imageSrc,
    href: USDCFastBridge.getHref({
      from: childChain.id,
      to: parentChain.id,
      fromTokenAddress: isArbitrumSepolia
        ? CommonAddress.ArbitrumSepolia.USDC
        : CommonAddress.ArbitrumOne.USDC,
      toTokenAddress: isArbitrumSepolia
        ? CommonAddress.Sepolia.USDC
        : CommonAddress.Ethereum.USDC,
      amount: props.amount,
      transferMode: 'withdraw'
    })
  }))

  return (
    <Dialog
      {...props}
      title={`Move funds to ${destinationNetworkName}`}
      actionButtonProps={{
        disabled: !allCheckboxesCheched,
        hidden: selectedTabName === SelectedTabName.ThirdParty
      }}
    >
      <div className="flex max-h-screen w-full flex-col pt-4">
        <Tab.Group>
          <Tab.List className="flex border-b border-gray-dark">
            <TabButton
              aria-label="Third party (USDC)"
              onClick={() => setSelectedTabName(SelectedTabName.ThirdParty)}
            >
              Third party (USDC)
            </TabButton>
            <TabButton
              aria-label="Circle (USDC)"
              onClick={() => setSelectedTabName(SelectedTabName.Cctp)}
            >
              Circle (USDC)
            </TabButton>
          </Tab.List>

          <Tab.Panel className="flex flex-col space-y-4 py-4">
            <div className="flex flex-col space-y-4 font-light">
              <p>
                Receive <span className="font-medium">USDC</span> on{' '}
                {destinationNetworkName} using a third-party bridge with
                Circle&apos;s{' '}
                <ExternalLink
                  className="arb-hover underline"
                  href={CCTP_DOCUMENTATION}
                >
                  Cross-Chain Transfer Protocol
                </ExternalLink>{' '}
                integrated.
              </p>
            </div>

            <BridgesTable
              bridgeList={fastBridges}
              selectedNonCanonicalToken={tokenSymbol}
            />
          </Tab.Panel>

          <Tab.Panel className="flex flex-col space-y-4 py-4">
            <div className="flex flex-col space-y-4">
              <CctpTabContent toNetworkName={destinationNetworkName}>
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
            </div>
          </Tab.Panel>
        </Tab.Group>
      </div>
    </Dialog>
  )
}
