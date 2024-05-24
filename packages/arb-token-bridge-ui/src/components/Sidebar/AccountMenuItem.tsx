import {
  ArrowLeftOnRectangleIcon,
  ArrowTopRightOnSquareIcon,
  Cog6ToothIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline'
import { MenuItem, MenuItemExpandable } from '@offchainlabs/cobalt'

import { getExplorerUrl } from '../../util/networks'
import { SafeImage } from '../common/SafeImage'
import { useAccountMenu } from '../../hooks/useAccountMenu'
import { CustomBoringAvatar } from '../common/CustomBoringAvatar'

export const AccountMenuItem = () => {
  const {
    address,
    accountShort,
    ensName,
    ensAvatar,
    openTransactionHistory,
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
      <MenuItem
        title="Transactions"
        Icon={<DocumentTextIcon className="h-[18px] w-[18px]" />}
        onClick={openTransactionHistory}
        isMobile
      />
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
