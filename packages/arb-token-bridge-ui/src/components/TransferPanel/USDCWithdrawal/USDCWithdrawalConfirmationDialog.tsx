import { useCallback, useEffect, useState } from 'react'

import { Tab } from '@headlessui/react'

import { Dialog, UseDialogProps } from '../../common/Dialog'
import { ExternalLink } from '../../common/ExternalLink'
import {
  SpecialTokenSymbol,
  USDCFastBridges,
  FastBridgeInfo
} from '../../../util/fastBridges'
import { TabButton } from '../../common/Tab'
import { BridgesTable } from '../../common/BridgesTable'
import {
  getExplorerUrl,
  getNetworkName,
  isNetwork
} from '../../../util/networks'
import { CommonAddress } from '../../../util/CommonAddressUtils'
import { USDCWithdrawalConfirmationDialogCheckbox } from './USDCWithdrawalConfirmationDialogCheckbox'
import { CctpTabContent } from '../CctpTabContent'
import { CCTP_DOCUMENTATION } from '../../../constants'
import { useNetworks } from '../../../hooks/useNetworks'
import { useNetworksRelationship } from '../../../hooks/useNetworksRelationship'
import { SecurityNotGuaranteed } from '../SecurityLabels'
import { trackEvent } from '../../../util/AnalyticsUtils'
import { getUSDCAddresses } from '../../../state/cctpState'

enum SelectedTabName {
  ThirdParty = 'third_party',
  Cctp = 'cctp'
}

const defaultSelectedTabName: SelectedTabName = SelectedTabName.ThirdParty

export function USDCWithdrawalConfirmationDialog(
  props: UseDialogProps & { amount: string }
) {
  const [networks] = useNetworks()
  const { childChain, parentChain } = useNetworksRelationship(networks)

  const [allCheckboxesCheched, setAllCheckboxesChecked] = useState(false)
  const [selectedTabName, setSelectedTabName] = useState<SelectedTabName>(
    defaultSelectedTabName
  )
  const { isArbitrumSepolia } = isNetwork(childChain.id)
  const destinationNetworkName = getNetworkName(parentChain.id)
  const tokenSymbol = SpecialTokenSymbol.USDC

  const handleActionButtonClick = useCallback(
    (confirmed: boolean) => {
      if (confirmed) {
        trackEvent('Use CCTP Click', { tokenSymbol, type: 'Withdrawal' })
      }
      props.onClose(confirmed, selectedTabName)
      // reset tab
      setSelectedTabName(defaultSelectedTabName)
    },
    [props, tokenSymbol, selectedTabName]
  )

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
      onClose={handleActionButtonClick}
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
                Receive{' '}
                <ExternalLink
                  className="arb-hover underline"
                  href={`${getExplorerUrl(parentChain.id)}/token/${
                    getUSDCAddresses(parentChain.id)?.USDC
                  }`}
                >
                  Native USDC
                </ExternalLink>{' '}
                on {destinationNetworkName} using a third-party bridge with
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
            <SecurityNotGuaranteed />
          </Tab.Panel>

          <Tab.Panel className="flex flex-col space-y-4 py-4">
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
          </Tab.Panel>
        </Tab.Group>
      </div>
    </Dialog>
  )
}
