import * as ethers from 'ethers'
import { Network } from 'components/App/networks' 
interface InjectedEthereumProvider{
  request?: (arg:any) => Promise<string[]>
  on: any
  networkVersion: string
  selectedAddress?: string
}

declare global {
  interface Window {
    ethereum?: InjectedEthereumProvider
  }
}

export function web3Injected(
  e: InjectedEthereumProvider | undefined
): e is InjectedEthereumProvider {
  return e !== undefined
  }

export async function requestNetworkSwitch(network:Network) {
  const chainId = ethers.BigNumber.from(network.chainID).toHexString()
  if (web3Injected(window.ethereum)) {
    try {
      ;(await window.ethereum.request?.({ method: 'wallet_addEthereumChain', params: [{
        chainId: chainId, // A 0x-prefixed hexadecimal string
        chainName: network.name,
        nativeCurrency: {
          name: "Ether",
          symbol: "ETH", // 2-6 characters long
          decimals: 18
        },
        rpcUrls: [network.url]
      } ] }))
    } catch (e) {
      console.warn('requestNetworkSwitch error', e)
      return []
    }
  }

  console.warn('No web3 injection detected')
  return []
}

export async function getInjectedWeb3(): Promise<
  [ethers.providers.JsonRpcProvider?, string?]
> {
  if (web3Injected(window.ethereum)) {
    try {
      ;(await window.ethereum.request?.({ method: 'eth_requestAccounts' })) ??
        console.warn('No window.ethereum.enable function')
    } catch (e) {
      console.warn('Failed to enable window.ethereum: ' + e.message)
      return []
    }

    return [
      new ethers.providers.Web3Provider(window.ethereum),
      window.ethereum.networkVersion
    ]
  }

  console.warn('No web3 injection detected')
  return []
}

export const setChangeListeners = () => {
  // this prevents multiple refreshes browser glitch
  let reloading = false
  if (web3Injected(window.ethereum)) {
    console.warn('setting listeners')

    !reloading &&
      window.ethereum.on('networkChanged', (chainId: number) => {
        reloading = true
        window.location.reload()
      })
    !reloading &&
      window.ethereum.on('accountsChanged', (chainId: number) => {
        reloading = true
        window.location.reload()
      })
  }
}
