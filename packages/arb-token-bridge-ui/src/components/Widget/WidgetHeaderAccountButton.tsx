import { useAccount, useDisconnect, useEnsAvatar } from 'wagmi'
import { Button } from '../common/Button'

import { shortenAddress } from '../../util/CommonUtils'
import { SafeImage } from '../common/SafeImage'
import { CustomBoringAvatar } from '../common/CustomBoringAvatar'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import {
  ArrowLeftEndOnRectangleIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline'
import { Popover, Transition } from '@headlessui/react'

export const WidgetHeaderAccountButton = () => {
  const { isConnected, address } = useAccount()
  const { openConnectModal } = useConnectModal()
  const { disconnect } = useDisconnect()
  const { data: ensAvatar } = useEnsAvatar({
    address,
    chainId: 1
  })

  return (
    <div className="flex items-center gap-2 text-sm text-white">
      {isConnected && (
        <Popover className="relative w-full px-4 text-white sm:w-max sm:p-0">
          <Popover.Button className="flex items-center gap-2">
            <SafeImage
              src={ensAvatar || undefined}
              className="h-6 w-6 rounded-full"
              fallback={<CustomBoringAvatar size={20} name={address} />}
            />{' '}
            {shortenAddress(address ?? '')}
            <ChevronDownIcon className="h-3 w-3" />
          </Popover.Button>

          <Transition>
            <Popover.Panel className="flex w-full flex-col overflow-hidden rounded pb-2 sm:absolute sm:top-0 sm:bg-dark">
              <div className="flex w-full flex-col justify-between sm:flex-col sm:items-end sm:px-0">
                <button onClick={() => disconnect()}>
                  <ArrowLeftEndOnRectangleIcon className="h-3 w-3 text-white/60 sm:text-white" />
                  <span>Disconnect</span>
                </button>
              </div>
            </Popover.Panel>
          </Transition>
        </Popover>
      )}

      {!isConnected && (
        <Button
          variant="primary"
          className="flex w-full justify-between bg-lime-dark"
          onClick={openConnectModal}
        >
          <div>Connect Wallet</div>
        </Button>
      )}
    </div>
  )
}
