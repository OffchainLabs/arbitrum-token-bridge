import { PlusCircleIcon } from '@heroicons/react/24/outline'
import { MenuItem } from '@offchainlabs/cobalt'
import { ConnectButton } from '@rainbow-me/rainbowkit'

export function HeaderConnectWalletButton() {
  return (
    <ConnectButton.Custom>
      {({ openConnectModal }) => (
        <MenuItem
          title="Connect Wallet"
          onClick={openConnectModal}
          Icon={<PlusCircleIcon className="h-[24px] w-[24px] stroke-1" />}
          className="border-lime-dark bg-lime-dark py-3"
        />
      )}
    </ConnectButton.Custom>
  )
}
