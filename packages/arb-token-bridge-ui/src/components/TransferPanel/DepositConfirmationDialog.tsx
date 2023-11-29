import { Tab, Dialog as HeadlessUIDialog } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'

import { Dialog, UseDialogProps } from '../common/Dialog'
import { Button } from '../common/Button'
import { ExternalLink } from '../common/ExternalLink'
import {
  NonCanonicalTokenAddresses,
  NonCanonicalTokenNames,
  NonCanonicalTokensBridgeInfo,
  FastBridgeNames,
  getFastBridges
} from '../../util/fastBridges'
import { TabButton } from '../common/Tab'
import { BridgesTable } from '../common/BridgesTable'
import { useAppState } from '../../state'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import { getNetworkName, isNetwork } from '../../util/networks'
import { useIsConnectedToArbitrum } from '../../hooks/useIsConnectedToArbitrum'

export function DepositConfirmationDialog(
  props: UseDialogProps & { amount: string }
) {
  const {
    app: { selectedToken }
  } = useAppState()
  const { l1, l2 } = useNetworksAndSigners()
  const isConnectedToArbitrum = useIsConnectedToArbitrum()
  const networkName = getNetworkName(l2.network.id)
  const { isArbitrumOne } = isNetwork(l2.network.id)

  const from = isConnectedToArbitrum ? l2.network : l1.network
  const to = isConnectedToArbitrum ? l1.network : l2.network

  const tokenSymbol = selectedToken?.symbol as NonCanonicalTokenNames
  const tokenAddress = selectedToken?.address as NonCanonicalTokenAddresses
  const bridgeInfo = NonCanonicalTokensBridgeInfo[tokenAddress]

  if (!bridgeInfo) {
    return null
  }

  const fastBridges = [
    ...getFastBridges({
      from: from.id,
      to: to.id,
      tokenSymbol,
      amount: props.amount
    })
  ].filter(bridge => {
    return (
      tokenSymbol &&
      (bridgeInfo.supportedBridges as readonly FastBridgeNames[]).includes(
        bridge.name
      )
    )
  })

  return (
    <Dialog {...props} isCustom>
      <div className="flex flex-col md:min-w-[725px] md:max-w-[725px]">
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
          </Tab.List>

          {isArbitrumOne && tokenSymbol && (
            <Tab.Panel className="flex flex-col space-y-3 px-8 py-4">
              <div className="flex flex-col space-y-3">
                <p className="font-light">
                  To get the canonical variant of {tokenSymbol} directly onto{' '}
                  {networkName} you’ll have to use a bridge that {tokenSymbol}{' '}
                  has fully integrated with.{' '}
                  <ExternalLink
                    href={bridgeInfo.learnMoreUrl}
                    className="underline"
                  >
                    Learn more
                  </ExternalLink>
                  .
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
        </Tab.Group>
      </div>
    </Dialog>
  )
}
