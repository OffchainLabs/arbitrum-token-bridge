import { useConnectModal } from '@rainbow-me/rainbowkit'

import { Button } from '../common/Button'

export function ConnectWalletButton() {
  const { openConnectModal } = useConnectModal()

  return (
    <Button
      variant="primary"
      onClick={openConnectModal}
      className="w-full border border-lime-dark bg-lime-dark py-3 text-lg lg:text-2xl"
    >
      <span className="block w-[360px] truncate">Connect Wallet</span>
    </Button>
  )
}
