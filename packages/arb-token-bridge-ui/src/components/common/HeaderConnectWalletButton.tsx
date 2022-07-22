import { useWallet } from '@arbitrum/use-wallet'

import { modalProviderOpts } from '../../util/modelProviderOpts'

export function HeaderConnectWalletButton() {
  const { connect } = useWallet()

  return (
    <button
      onClick={() => connect(modalProviderOpts)}
      type="button"
      className="arb-hover rounded-full py-3 text-2xl font-medium text-white lg:bg-lime-dark lg:px-6 lg:text-base lg:font-normal"
    >
      Connect Wallet
    </button>
  )
}
