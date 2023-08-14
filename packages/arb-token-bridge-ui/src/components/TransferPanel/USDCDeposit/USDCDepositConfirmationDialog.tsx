import { useState } from 'react'
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
import { useNetworksAndSigners } from '../../../hooks/useNetworksAndSigners'
import { getNetworkName, isNetwork } from '../../../util/networks'
import { trackEvent } from '../../../util/AnalyticsUtils'
import { useIsConnectedToArbitrum } from '../../../hooks/useIsConnectedToArbitrum'
import { CommonAddress } from '../../../util/CommonAddressUtils'
import { USDCDepositConfirmationDialogCheckbox } from './USDCDepositConfirmationDialogCheckbox'
import { isTokenGoerliUSDC, isTokenMainnetUSDC } from '../../../util/TokenUtils'
import { getExplorerUrl } from '../../../util/networks'
import { useChainId } from 'wagmi'

type Props = UseDialogProps & {
  amount: string
}
export function USDCDepositConfirmationDialog(props: Props) {
  const {
    app: { selectedToken }
  } = useAppState()
  const { l1, l2 } = useNetworksAndSigners()
  const isConnectedToArbitrum = useIsConnectedToArbitrum()
  const networkName = getNetworkName(l2.network.id)
  const { isArbitrumGoerli } = isNetwork(l2.network.id)
  const chainId = useChainId()
  const [allCheckboxesCheched, setAllCheckboxesChecked] = useState(false)

  const from = isConnectedToArbitrum ? l2.network : l1.network
  const to = isConnectedToArbitrum ? l1.network : l2.network

  if (!selectedToken) {
    return null
  }

  if (
    !isTokenMainnetUSDC(selectedToken.address) &&
    !isTokenGoerliUSDC(selectedToken.address)
  ) {
    return null
  }

  const tokenSymbol = SpecialTokenSymbol.USDC

  const fastBridges: FastBridgeInfo[] = USDCFastBridges.map(USDCFastBridge => ({
    name: USDCFastBridge.name,
    imageSrc: USDCFastBridge.imageSrc,
    href: USDCFastBridge.getHref({
      from: from.id,
      to: to.id,
      fromTokenAddress: isArbitrumGoerli
        ? CommonAddress.Goerli.USDC
        : CommonAddress.Mainnet.USDC,
      toTokenAddress: isArbitrumGoerli
        ? CommonAddress.ArbitrumGoerli.USDC
        : CommonAddress.ArbitrumOne.USDC,
      amount: props.amount,
      transferMode: 'deposit'
    })
  }))

  return (
    <Dialog {...props} isCustom>
      <div className="flex flex-col md:min-w-[725px]">
        <Tab.Group
          onChange={() => {
            setAllCheckboxesChecked(false)
          }}
        >
          <div className="flex flex-row items-center justify-between bg-ocl-blue px-8 py-4">
            <HeadlessUIDialog.Title className="text-2xl font-medium text-white">
              Move funds to {networkName}
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

          <Tab.List className="bg-ocl-blue">
            <TabButton>Use Arbitrum&apos;s bridge (USDC.e)</TabButton>
            <TabButton>Use a third-party bridge</TabButton>
            <TabButton>Use Arbitrum&apos;s bridge (USDC)</TabButton>
          </Tab.List>

          <Tab.Panel className="flex flex-col space-y-3 px-8 py-4">
            <div className="flex flex-col space-y-3">
              <p className="font-light">
                Receive{' '}
                <ExternalLink
                  className="arb-hover text-blue-link underline"
                  href={`https://arbiscan.io/token/${CommonAddress.ArbitrumOne['USDC.e']}`}
                >
                  Bridged USDC (USDC.e)
                </ExternalLink>{' '}
                on Arbitrum One using Arbitrum&apos;s native bridge.
              </p>

              <div className="flex flex-col space-y-6">
                <USDCDepositConfirmationDialogCheckbox
                  onChange={checked => {
                    setAllCheckboxesChecked(checked)
                  }}
                />
              </div>
            </div>

            <div className="mt-2 flex flex-row justify-end space-x-2">
              <Button variant="secondary" onClick={() => props.onClose(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                disabled={!allCheckboxesCheched}
                onClick={() => {
                  props.onClose(true, 'bridged')
                  setAllCheckboxesChecked(false)
                  trackEvent('Use Arbitrum Bridge Click', {
                    tokenSymbol
                  })
                }}
              >
                Confirm
              </Button>
            </div>
          </Tab.Panel>

          <Tab.Panel className="flex flex-col space-y-3 px-8 py-4">
            <div className="flex flex-col space-y-3">
              <p className="font-light">
                Receive{' '}
                <ExternalLink
                  className="arb-hover text-blue-link underline"
                  href={`https://arbiscan.io/token/${CommonAddress.ArbitrumOne.USDC}`}
                >
                  USDC
                </ExternalLink>{' '}
                on Arbitrum One using a third-party bridge with Circle&apos;s
                CCTP integrated.
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
            <div className="flex flex-col space-y-3">
              <p className="font-light">
                Receive{' '}
                <ExternalLink
                  className="arb-hover text-blue-link underline"
                  href={`${getExplorerUrl(chainId)}/token/${
                    selectedToken.address
                  }`}
                >
                  Native USDC
                </ExternalLink>{' '}
                on Arbitrum One using Arbitrum&apos;s native bridge with
                Circle&apos;s{' '}
                <ExternalLink
                  className="arb-hover text-blue-link underline"
                  href="https://www.circle.com/en/cross-chain-transfer-protocol"
                >
                  CCTP
                </ExternalLink>{' '}
                integrated.
              </p>

              <div className="flex flex-col space-y-6">
                <USDCDepositConfirmationDialogCheckbox
                  onAllCheckboxesCheched={() => {
                    setAllCheckboxesChecked(true)
                  }}
                  onChange={checked => {
                    if (!checked) {
                      setAllCheckboxesChecked(false)
                    }
                  }}
                  isBridingNativeUSDC
                />
              </div>
            </div>
            <div className="mt-2 flex flex-row justify-end space-x-2">
              <Button variant="secondary" onClick={() => props.onClose(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                disabled={!allCheckboxesCheched}
                onClick={() => {
                  props.onClose(true, 'cctp')
                  setAllCheckboxesChecked(false)
                  trackEvent('Use Arbitrum Bridge Click', {
                    tokenSymbol
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
