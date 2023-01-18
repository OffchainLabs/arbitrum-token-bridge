import { useWallet } from '@arbitrum/use-wallet'

import { modalProviderOpts } from '../../util/modelProviderOpts'

import ConnectLogo from '../../assets/header/headerLogo_connect.webp'

export function HeaderConnectWalletButton() {
  const { connect } = useWallet()

  async function showConnectionModal() {
    try {
      await connect(modalProviderOpts)
    } catch (error) {
      // Dialog was closed by user
    }
  }

  return (
    <button
      onClick={showConnectionModal}
      type="button"
      className="arb-hover flex w-full flex-row items-center rounded-full p-4 text-2xl font-medium text-white lg:bg-lime-dark lg:py-2 lg:px-4 lg:text-base lg:font-normal"
    >
      <img
        src={ConnectLogo}
        alt="Connect Wallet"
        className="max-w-8 mr-4 max-h-8"
      />
      Connect Wallet
    </button>
  )
}
