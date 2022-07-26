import { useWallet } from '@arbitrum/use-wallet'

import { modalProviderOpts } from '../../util/modelProviderOpts'

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
      className="arb-hover rounded-full py-3 text-2xl font-medium text-white lg:bg-lime-dark lg:px-6 lg:text-base lg:font-normal"
    >
      Connect Wallet
    </button>
  )
}
