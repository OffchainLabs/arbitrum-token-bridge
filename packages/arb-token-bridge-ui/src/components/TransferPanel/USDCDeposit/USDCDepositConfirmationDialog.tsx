import React, { useCallback, useEffect, useState } from 'react'
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
import { useAppState } from '../../../state'
import { getNetworkName, isNetwork } from '../../../util/networks'
import { trackEvent } from '../../../util/AnalyticsUtils'
import { CommonAddress } from '../../../util/CommonAddressUtils'
import { USDCDepositConfirmationDialogCheckbox } from './USDCDepositConfirmationDialogCheckbox'
import {
  isTokenSepoliaUSDC,
  isTokenMainnetUSDC
} from '../../../util/TokenUtils'
import { CctpTabContent } from '../CctpTabContent'
import { CCTP_DOCUMENTATION } from '../../../constants'
import { useNetworks } from '../../../hooks/useNetworks'
import { useNetworksRelationship } from '../../../hooks/useNetworksRelationship'

type Props = UseDialogProps & {
  amount: string
}

enum SelectedTabName {
  Bridged = 'bridged',
  ThirdParty = 'third_party',
  Cctp = 'cctp'
}

export function USDCDepositConfirmationDialog(props: Props) {
  const {
    app: { selectedToken }
  } = useAppState()
  const [networks] = useNetworks()
  const { childChain, parentChain } = useNetworksRelationship(networks)
  const { isArbitrumSepolia } = isNetwork(childChain.id)
  const [allCheckboxesCheched, setAllCheckboxesChecked] = useState(false)
  const [selectedTabName, setSelectedTabName] = useState<SelectedTabName>(
    SelectedTabName.Bridged
  )
  const destinationNetworkName = getNetworkName(childChain.id)

  const tokenSymbol = SpecialTokenSymbol.USDC

  useEffect(() => {
    setAllCheckboxesChecked(false)
  }, [props.isOpen])

  const handleActionButtonClick = useCallback(
    (confirmed: boolean) => {
      if (confirmed) {
        trackEvent('Use Arbitrum Bridge Click', { tokenSymbol })
      }
      props.onClose(confirmed, selectedTabName)
    },
    [props, tokenSymbol, selectedTabName]
  )

  if (!selectedToken) {
    return null
  }

  if (
    !isTokenMainnetUSDC(selectedToken.address) &&
    !isTokenSepoliaUSDC(selectedToken.address)
  ) {
    return null
  }

  const fastBridges: FastBridgeInfo[] = USDCFastBridges.map(USDCFastBridge => ({
    name: USDCFastBridge.name,
    imageSrc: USDCFastBridge.imageSrc,
    href: USDCFastBridge.getHref({
      from: parentChain.id,
      to: childChain.id,
      fromTokenAddress: isArbitrumSepolia
        ? CommonAddress.Sepolia.USDC
        : CommonAddress.Ethereum.USDC,
      toTokenAddress: isArbitrumSepolia
        ? CommonAddress.ArbitrumSepolia.USDC
        : CommonAddress.ArbitrumOne.USDC,
      amount: props.amount,
      transferMode: 'deposit'
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
      <div className="flex flex-col pt-4">
        <Tab.Group
          onChange={() => {
            setAllCheckboxesChecked(false)
          }}
        >
          <Tab.List className="flex border-b border-gray-dark">
            <TabButton
              aria-label="Arbitrum's bridge (USDC.e)"
              onClick={() => setSelectedTabName(SelectedTabName.Bridged)}
            >
              Arbitrum&apos;s bridge (USDC.e)
            </TabButton>
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
            <div className="flex flex-col space-y-4">
              <p className="font-light">
                Receive{' '}
                <span className="font-medium">Bridged USDC (USDC.e)</span> on{' '}
                {destinationNetworkName} using Arbitrum&apos;s native bridge.
              </p>

              <div className="flex flex-col space-y-4">
                <USDCDepositConfirmationDialogCheckbox
                  onChange={checked => {
                    setAllCheckboxesChecked(checked)
                  }}
                />
              </div>
            </div>
          </Tab.Panel>

          <Tab.Panel className="flex flex-col space-y-4 py-4">
            <div className="flex flex-col space-y-4">
              <p className="font-light">
                Receive <span className="font-medium">Native USDC</span> on
                Arbitrum One using a third-party bridge with Circle&apos;s{' '}
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
            </div>
          </Tab.Panel>
        </Tab.Group>
      </div>
    </Dialog>
  )
}
