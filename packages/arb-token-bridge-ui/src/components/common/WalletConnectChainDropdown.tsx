import { Chain } from 'wagmi'
import { useMemo } from 'react'

import { TargetChainKey } from '../../util/WalletConnectUtils'
import { getSupportedNetworks } from '../../util/networks'
import { getWagmiChain } from '../../util/wagmi/getWagmiChain'
import { NetworkListbox } from '../TransferPanel/NetworkListbox'

export default function WalletConnectChainDropdown() {
  const options = getSupportedNetworks(undefined, true)
    .map(chainId => {
      const wagmiChain = getWagmiChain(chainId)
      const targetChainKey =
        TargetChainKey[wagmiChain.name as keyof typeof TargetChainKey]

      if (!targetChainKey) {
        return undefined
      }
      return { ...wagmiChain, network: targetChainKey as string }
    })
    .filter((chain): chain is Chain => chain !== undefined)

  const searchParams = useMemo(() => {
    if (typeof window === 'undefined') return undefined
    return new URLSearchParams(window.location.search)
  }, [])

  const walletConnectChain = searchParams?.get('walletConnectChain')

  const chain = (() => {
    try {
      return options.find(chain => chain.network === walletConnectChain)
    } catch (error) {
      return undefined
    }
  })()

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
    <div className="m-3 flex max-w-md flex-col gap-2 self-end rounded-md bg-cyan px-3 py-2 text-sm text-cyan-dark">
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
  )
}
