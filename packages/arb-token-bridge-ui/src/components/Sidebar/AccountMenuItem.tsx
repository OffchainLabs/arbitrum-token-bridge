import {
  ArrowLeftOnRectangleIcon,
  ArrowTopRightOnSquareIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline'
import { MenuItem, MenuItemExpandable } from '@offchainlabs/cobalt'

import { useAccountMenu } from '../../hooks/useAccountMenu'
import { getExplorerUrl } from '../../util/networks'
import { CustomBoringAvatar } from '../common/CustomBoringAvatar'
import { SafeImage } from '../common/SafeImage'

export const AccountMenuItem = () => {
  const {
    address,
    accountShort,
    ensName,
    ensAvatar,
    disconnect,
    udInfo,
    chain,
    setQueryParams
  } = useAccountMenu()

  return (
    <MenuItemExpandable
      title={ensName ?? udInfo.name ?? accountShort}
      isMobile
      Icon={
        <SafeImage
          src={ensAvatar || undefined}
          className="h-6 w-6 rounded-full sm:h-8 sm:w-8"
          fallback={<CustomBoringAvatar size={24} name={address} />}
        />
      }
    >
      {chain && (
        <MenuItem
          title="Explorer"
          Icon={<ArrowTopRightOnSquareIcon className="h-[18px] w-[18px]" />}
          href={`${getExplorerUrl(chain.id)}/address/${address}`}
          isMobile
        />
      )}
      <MenuItem
        title="Settings"
        Icon={<Cog6ToothIcon className="h-[18px] w-[18px]" />}
        onClick={() => setQueryParams({ settingsOpen: true })}
        isMobile
      />
      <MenuItem
        title="Disconnect"
        Icon={<ArrowLeftOnRectangleIcon className="h-[18px] w-[18px]" />}
        onClick={() => disconnect()}
        isMobile
      />
    </MenuItemExpandable>
  )
}
