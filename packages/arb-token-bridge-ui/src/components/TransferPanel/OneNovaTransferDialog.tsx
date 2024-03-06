import { Tab } from '@headlessui/react'
import Hop from '@/images/bridge/hop.png'

import { useAppState } from '../../state'
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
      title={`Move funds from ${getNetworkName(
        sourceChainId
      )} to ${getNetworkName(destinationChainId ?? 0)}`}
      actionButtonProps={{ hidden: true }}
      className="max-w-[700px]"
    >
      <div className="flex flex-col pt-4">
        <Tab.Group>
          <Tab.List className="border-b border-gray-dark">
            <TabButton>Third party bridge</TabButton>
          </Tab.List>

          <Tab.Panel className="flex flex-col space-y-4 py-4">
            <div className="flex flex-col space-y-3">
              <p className="font-light">
                Use a third party bridge to transfer funds between Arbitrum One
                and Arbitrum Nova.
              </p>
            </div>

            <BridgesTable bridgeList={fastBridgeList} />
            <SecurityNotGuaranteed />
          </Tab.Panel>
        </Tab.Group>
      </div>
    </Dialog>
  )
}
