import { Dialog as HeadlessUIDialog, Tab } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import Hop from '@/images/bridge/hop.png'

import { useAppState } from '../../state'
import { Button } from '../common/Button'
import { TabButton } from '../common/Tab'
import { BridgesTable } from '../common/BridgesTable'
import { SecurityNotGuaranteed } from './SecurityLabels'
import { Dialog, UseDialogProps } from '../common/Dialog'
import { FastBridgeInfo, FastBridgeNames } from '../../util/fastBridges'
import { ChainId, getNetworkName } from '../../util/networks'
import { ether } from '../../constants'

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

  const sourceChainId =
    destinationChainId === ChainId.ArbitrumNova
      ? ChainId.ArbitrumOne
      : ChainId.ArbitrumNova

  const sourceNetworkSlug =
    sourceChainId === ChainId.ArbitrumOne ? 'arbitrum' : 'nova'
  const destinationNetworkSlug =
    destinationChainId === ChainId.ArbitrumOne ? 'arbitrum' : 'nova'

  const bridgeDeepLink = `https://app.hop.exchange/#/send?sourceNetwork=${sourceNetworkSlug}&destNetwork=${destinationNetworkSlug}&token=${
    selectedToken?.symbol || ether.symbol
  }&amount=${props.amount}`

  // only enable Hop for now
  const fastBridgeList: FastBridgeInfo[] = [
    { name: FastBridgeNames.Hop, imageSrc: Hop, href: bridgeDeepLink }
  ]

  return (
    <Dialog
      {...props}
      onClose={() => props.onClose(false)}
      isCustom
      className="max-w-[700px]"
    >
      <div className="flex flex-col">
        <Tab.Group>
          <div className="flex flex-row items-center justify-between px-6 py-4">
            <HeadlessUIDialog.Title className="text-xl text-white">
              Move funds from {getNetworkName(sourceChainId)} to{' '}
              {getNetworkName(destinationChainId ?? 0)}
            </HeadlessUIDialog.Title>
            <button
              className="arb-hover"
              onClick={() => {
                props.onClose(false)
              }}
            >
              <XMarkIcon className="h-5 w-5 text-white" />
            </button>
          </div>

          <div className="px-6">
            <Tab.List className="border-b border-gray-dark">
              <TabButton>Third party bridge</TabButton>
            </Tab.List>
          </div>

          <Tab.Panel className="flex flex-col space-y-3 px-6 py-4">
            <div className="flex flex-col space-y-3">
              <p className="font-light">
                Use a third party bridge to transfer funds between Arbitrum One
                and Arbitrum Nova.
              </p>
            </div>

            <BridgesTable bridgeList={fastBridgeList} />
            <div className="mt-4 flex flex-row justify-between space-x-2">
              <SecurityNotGuaranteed />
              <Button
                className="text-white"
                variant="secondary"
                onClick={() => props.onClose(false)}
              >
                Cancel
              </Button>
            </div>
          </Tab.Panel>
        </Tab.Group>
      </div>
    </Dialog>
  )
}
