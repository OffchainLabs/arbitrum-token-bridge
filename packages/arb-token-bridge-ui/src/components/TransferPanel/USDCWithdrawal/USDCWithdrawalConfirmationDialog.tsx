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

export function USDCWithdrawalConfirmationDialog(
  props: UseDialogProps & { amount: string }
) {
  const [networks] = useNetworks()
  const { childChain, parentChain } = useNetworksRelationship(networks)

  const [allCheckboxesCheched, setAllCheckboxesChecked] = useState(false)
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
    <Dialog {...props} isCustom>
      <div className="flex max-h-screen w-full flex-col md:w-[750px] lg:w-[925px]">
        <Tab.Group>
          <div className="flex flex-row items-center justify-between bg-ocl-blue px-8 py-4">
            <HeadlessUIDialog.Title className="text-2xl font-medium text-white">
              Move funds to {destinationNetworkName}
            </HeadlessUIDialog.Title>
            <button
              className="arb-hover"
              onClick={() => {
                props.onClose(false)
              }}
            >
              <XMarkIcon className="h-6 w-6 text-white" />
            </button>
          </div>

          <Tab.List className="flex bg-ocl-blue">
            <TabButton aria-label="Third party (USDC)">
              Third party (USDC)
            </TabButton>
            <TabButton aria-label="Circle (USDC)">Circle (USDC)</TabButton>
          </Tab.List>

          <Tab.Panel className="flex flex-col space-y-3 px-8 py-4">
            <div className="flex flex-col space-y-3 font-light">
              <p>
                Receive <span className="font-medium">USDC</span> on{' '}
                {destinationNetworkName} using a third-party bridge with
                Circle&apos;s{' '}
                <ExternalLink
                  className="arb-hover text-blue-link underline"
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
            <div className="mt-2 flex flex-row justify-end space-x-2">
              <Button variant="secondary" onClick={() => props.onClose(false)}>
                Cancel
              </Button>
            </div>
          </Tab.Panel>

          <Tab.Panel className="flex flex-col space-y-3 px-8 py-4">
            <div className="flex flex-col space-y-6">
              <CctpTabContent toNetworkName={destinationNetworkName}>
                <div className="flex flex-col space-y-3">
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
            <div className="mt-2 flex flex-row justify-end space-x-2">
              <Button variant="secondary" onClick={() => props.onClose(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                disabled={!allCheckboxesCheched}
                onClick={() => {
                  props.onClose(true)
                  setAllCheckboxesChecked(false)
                  trackEvent('Use CCTP Click', {
                    tokenSymbol,
                    type: 'Withdrawal'
                  })
                }}
              >
                Confirm
              </Button>
            </div>
          </Tab.Panel>
        </Tab.Group>
      </div>
    </Dialog>
  )
}
