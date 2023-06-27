import { useState } from 'react'
import { Tab, Dialog as HeadlessUIDialog } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'

import { Dialog, UseDialogProps } from '../common/Dialog'
import { Button } from '../common/Button'
import { ExternalLink } from '../common/ExternalLink'
import {
  USDCBridgeInfo,
  FastBridgeNames,
  getFastBridges,
  SpecialTokenSymbol
} from '../../util/fastBridges'
import { TabButton } from '../common/Tab'
import { BridgesTable } from '../common/BridgesTable'
import { useAppState } from '../../state'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import { getNetworkName, isNetwork } from '../../util/networks'
import { trackEvent } from '../../util/AnalyticsUtils'
import { useIsConnectedToArbitrum } from '../../hooks/useIsConnectedToArbitrum'
import { CommonAddress } from '../../util/CommonAddressUtils'
import { USDCDepositWithArbBridgeInfo } from '../common/USDCDepositWithArbBridgeInfo'

export function USDCDepositConfirmationDialog(
  props: UseDialogProps & { amount: string }
) {
  const {
    app: { selectedToken }
  } = useAppState()
  const { l1, l2 } = useNetworksAndSigners()
  const isConnectedToArbitrum = useIsConnectedToArbitrum()
  const networkName = getNetworkName(l2.network.id)
  const { isArbitrumOne } = isNetwork(l2.network.id)

  const [USDCcheckboxChecked, setUSDCcheckboxChecked] = useState(false)

  const from = isConnectedToArbitrum ? l2.network : l1.network
  const to = isConnectedToArbitrum ? l1.network : l2.network

  const tokenSymbol = selectedToken?.symbol as SpecialTokenSymbol.USDC

  const fastBridges = [
    ...getFastBridges({
      from: from.id,
      to: to.id,
      tokenSymbol,
      toTokenAddress: CommonAddress.ArbitrumOne.USDC,
      amount: props.amount
    })
  ].filter(bridge => {
    return (
      tokenSymbol &&
      (USDCBridgeInfo.supportedBridges as readonly FastBridgeNames[]).includes(
        bridge.name
      )
    )
  })

  return (
    <Dialog {...props} isCustom>
      <div className="flex flex-col md:min-w-[725px]">
        <Tab.Group>
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
            {isArbitrumOne && <TabButton>Use a third-party bridge</TabButton>}
            <TabButton>Use Arbitrum’s bridge (USDC.e)</TabButton>
            <TabButton>Use Arbitrum’s bridge (USDC)</TabButton>
          </Tab.List>

          {isArbitrumOne && tokenSymbol && (
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
                  on Arbitrum One using a third-party bridge with Circle’s CCTP
                  integrated.
                </p>
              </div>

              <BridgesTable
                bridgeList={fastBridges}
                selectedNonCanonicalToken={tokenSymbol}
              />
              <div className="mt-2 flex flex-row justify-end space-x-2">
                <Button
                  variant="secondary"
                  onClick={() => props.onClose(false)}
                >
                  Cancel
                </Button>
              </div>
            </Tab.Panel>
          )}

          {tokenSymbol && (
            <Tab.Panel className="flex flex-col space-y-3 px-8 py-4">
              <USDCDepositWithArbBridgeInfo
                USDCcheckboxChecked={USDCcheckboxChecked}
                setUSDCcheckboxChecked={setUSDCcheckboxChecked}
              />

              <div className="mt-2 flex flex-row justify-end space-x-2">
                <Button
                  variant="secondary"
                  onClick={() => props.onClose(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  disabled={!USDCcheckboxChecked}
                  onClick={() => {
                    props.onClose(true)
                    setUSDCcheckboxChecked(false)
                    trackEvent('Use Arbitrum Bridge Click', {
                      tokenSymbol
                    })
                  }}
                >
                  Confirm
                </Button>
              </div>
            </Tab.Panel>
          )}

          <Tab.Panel className="flex flex-col space-y-3 px-8 py-4">
            <div>
              <p className="font-light">
                An option to receive native USDC on Arbitrum One using
                Arbitrum’s native bridge is coming soon.
              </p>
            </div>
            <div className="mt-2 flex flex-row justify-end space-x-2">
              <Button variant="secondary" onClick={() => props.onClose(false)}>
                Cancel
              </Button>
            </div>
          </Tab.Panel>
        </Tab.Group>
      </div>
    </Dialog>
  )
}
