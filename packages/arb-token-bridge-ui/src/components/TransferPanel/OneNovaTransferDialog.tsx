import { Dialog as HeadlessUIDialog, Tab } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import Hop from '@/images/bridge/hop.png'

import { useAppState } from '../../state'
import { TabButton } from '../common/Tab'
import { BridgesTable } from '../common/BridgesTable'
import { Dialog, UseDialogProps } from '../common/Dialog'
import { FastBridgeInfo, FastBridgeNames } from '../../util/fastBridges'
import { ChainId, getNetworkName } from '../../util/networks'

export function OneNovaTransferDialog(
  props: UseDialogProps & {
    destinationChainId: number | null
    amount: string
  }
) {
  const {
    app: { selectedToken }
  } = useAppState()

  const { destinationChainId } = props

  if (!destinationChainId) {
    return null
  }

  const sourceChainId =
    destinationChainId === ChainId.ArbitrumNova
      ? ChainId.ArbitrumOne
      : ChainId.ArbitrumNova

  const sourceNetworkSlug =
    sourceChainId === ChainId.ArbitrumOne ? 'arbitrum' : 'nova'
  const destinationNetworkSlug =
    destinationChainId === ChainId.ArbitrumOne ? 'arbitrum' : 'nova'

  const bridgeDeepLink = `https://app.hop.exchange/#/send?sourceNetwork=${sourceNetworkSlug}&destNetwork=${destinationNetworkSlug}&token=${
    selectedToken?.symbol || 'ETH'
  }&amount=${props.amount}`

  // only enable Hop for now
  const fastBridgeList: FastBridgeInfo[] = [
    { name: FastBridgeNames.Hop, imageSrc: Hop, href: bridgeDeepLink }
  ]

  return (
    <Dialog {...props} actionButtonProps={{ hidden: true }}>
      <div className="flex flex-col md:min-w-[725px]">
        <Tab.Group>
          <div className="flex flex-row items-center justify-between bg-ocl-blue px-8 py-4">
            <HeadlessUIDialog.Title className="text-2xl font-medium text-white">
              Move funds from {getNetworkName(sourceChainId)} to{' '}
              {getNetworkName(destinationChainId)}
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
            <TabButton>Use a third-party bridge</TabButton>
            <TabButton>Use Arbitrum’s bridge</TabButton>
          </Tab.List>

          <Tab.Panel className="flex flex-col space-y-3 px-8 py-4">
            <div className="flex flex-col space-y-3">
              <p className="font-light">
                Use a third party bridge to transfer funds between Arbitrum One
                and Arbitrum Nova.
              </p>
            </div>

            <BridgesTable bridgeList={fastBridgeList} />
          </Tab.Panel>

          <Tab.Panel className="flex flex-col space-y-3 px-8 py-4">
            <div className="flex flex-col space-y-3">
              <p className="font-light">
                Arbitrum’s native bridge between Arbitrum One and Arbitrum Nova
                is coming soon.
              </p>
            </div>
          </Tab.Panel>
        </Tab.Group>
      </div>
    </Dialog>
  )
}
