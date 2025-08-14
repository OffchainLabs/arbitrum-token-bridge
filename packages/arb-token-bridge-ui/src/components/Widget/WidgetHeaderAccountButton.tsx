import { useAccount, useDisconnect, useEnsAvatar, useEnsName } from 'wagmi'
import { twMerge } from 'tailwind-merge'
import {
  ArrowLeftEndOnRectangleIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline'
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react'
import { useConnectModal } from '@rainbow-me/rainbowkit'

import { Button } from '../common/Button'
import { shortenAddress } from '../../util/CommonUtils'
import { SafeImage } from '../common/SafeImage'
import { CustomBoringAvatar } from '../common/CustomBoringAvatar'
import { ChainId } from '../../types/ChainId'

export const WidgetHeaderAccountButton = () => {
  const { isConnected, address } = useAccount()
  const { openConnectModal } = useConnectModal()
  const { disconnect } = useDisconnect()
  const { data: ensName } = useEnsName({
    address,
    chainId: ChainId.Ethereum
  })

  const { data: ensAvatar } = useEnsAvatar({
    name: ensName ?? '',
    chainId: ChainId.Ethereum
  })

  return (
    <div className="flex items-center gap-2 text-base text-white">
      {isConnected && (
        <Menu>
          {({ open }) => (
            <>
              <MenuButton
                as={Button}
                variant="secondary"
                className="h-[40px] px-[10px] py-[10px]"
              >
                <div className="flex flex-nowrap items-center gap-2">
                  <SafeImage
                    src={ensAvatar || undefined}
                    className="h-6 w-6 rounded-full"
                    fallback={<CustomBoringAvatar size={20} name={address} />}
                  />{' '}
                  {shortenAddress(address ?? '')}
                  <ChevronDownIcon
                    className={twMerge(
                      'h-3 w-3 transition-all',
                      open && 'rotate-180'
                    )}
                  />
                </div>
              </MenuButton>
              <MenuItems
                transition
                anchor="bottom"
                className="ml-2 mt-2 origin-top overflow-hidden rounded-md text-sm text-white transition"
              >
                <MenuItem
                  as="button"
                  className="flex cursor-pointer items-center gap-2 bg-dark p-2 px-3 hover:bg-[#303030] focus-visible:!outline-none"
                  onClick={() => disconnect()}
                >
                  <ArrowLeftEndOnRectangleIcon className="h-3 w-3 text-white/60 sm:text-white" />
                  <span>Disconnect</span>
                </MenuItem>
              </MenuItems>
            </>
          )}
        </Menu>
      )}

      {!isConnected && (
        <Button
          variant="primary"
          className="flex h-[30px] w-full justify-between bg-primary-cta"
          onClick={openConnectModal}
        >
          <div>Connect Wallet</div>
        </Button>
      )}
    </div>
  )
}
