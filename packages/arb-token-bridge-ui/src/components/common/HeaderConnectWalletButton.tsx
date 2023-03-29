import { useWallet } from '@arbitrum/use-wallet'
import { PlusCircleIcon } from '@heroicons/react/outline'

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
      className="arb-hover flex w-full flex-row items-center bg-lime-dark px-6 py-3 text-2xl font-medium text-white lg:rounded-full lg:bg-lime-dark lg:px-4 lg:py-2 lg:text-base lg:font-normal"
    >
      <PlusCircleIcon className="mr-3 h-10 w-10 rounded-full bg-white stroke-lime-dark p-1 opacity-40" />
      Connect Wallet
    </button>
  )
}
