import { useWallet } from '@arbitrum/use-wallet'

export function DisconnectWallet() {

  const { disconnect, account, web3Modal } = useWallet()

  function disconnectWallet() {
    disconnect()
    web3Modal?.clearCachedProvider()
    window.location.reload()
  }
  return (
    <button
      className="arb-hover flex w-full flex-row items-center px-6 py-3 text-2xl font-medium text-white lg:rounded-full lg:px-4 lg:py-2 lg:text-base lg:font-normal bg-neutral-700"
      onClick={disconnectWallet}
    >
      <span>Disconnect Wallet</span>
    </button>
  )
}
  