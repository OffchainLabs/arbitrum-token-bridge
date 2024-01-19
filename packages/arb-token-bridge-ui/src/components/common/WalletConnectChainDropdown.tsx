import { Chain } from 'wagmi'
import { useMemo } from 'react'

import { chainIdToWalletConnectKey } from '../../util/WalletConnectUtils'
import { ChainId, getSupportedNetworks } from '../../util/networks'
import { getWagmiChain } from '../../util/wagmi/getWagmiChain'
import { NetworkListbox } from '../TransferPanel/NetworkListbox'

export default function WalletConnectChainDropdown() {
  const options = getSupportedNetworks(undefined, true)
    .map(chainId => {
      const wagmiChain = getWagmiChain(chainId)
      const network = chainIdToWalletConnectKey[chainId as ChainId] as string

      if (!network) {
        return undefined
      }
      return { ...wagmiChain, network }
    })
    .filter((chain): chain is Chain => chain !== undefined)

  const searchParams = useMemo(() => {
    if (typeof window === 'undefined') return undefined
    return new URLSearchParams(window.location.search)
  }, [])

  const walletConnectChain = searchParams?.get('walletConnectChain')

  const chain = options.find(chain => chain.network === walletConnectChain)

  function onChange(value: Chain) {
    searchParams?.set('walletConnectChain', String(value.network))
    history.pushState(
      null,
      '',
      `?walletConnectChain=${value.network}&sourceChain=${value.id}`
    )
    window.location.reload()
  }

  return (
    <div className="p-3 lg:self-end">
      <div className="flex w-full flex-col gap-2 rounded-md bg-cyan px-3 py-2 text-sm text-cyan-dark lg:max-w-md">
        <p>
          For <strong>WalletConnect</strong> users, <br />
          choose your chain before connecting:
        </p>
        <NetworkListbox
          label={''}
          placeholder="Select a chain"
          value={chain}
          options={options}
          onChange={onChange}
          buttonClassName="md:text-sm w-full justify-between"
        />
      </div>
    </div>
  )
}
