import * as ethers from 'ethers'

interface InjectedEthereumProvider
  extends ethers.ethers.providers.AsyncSendable {
  enable?: () => Promise<string[]>
  on: any
  networkVersion: string
}

declare global {
  interface Window {
    ethereum?: InjectedEthereumProvider
    reloadListenerSet: boolean
  }
}

export function web3Injected(
  e: InjectedEthereumProvider | undefined
): e is InjectedEthereumProvider {
  return e !== undefined
}

export async function getInjectedWeb3(): Promise<
  [ethers.providers.JsonRpcProvider, string]
> {
  if (web3Injected(window.ethereum)) {
    try {
      ;(await window.ethereum.enable?.()) ??
        console.warn('No window.ethereum.enable function')
    } catch (e) {
      throw new Error('Failed to enable window.ethereum: ' + e.message)
    }
    // TODO: hacky, move this
    !window.reloadListenerSet &&
      window.ethereum.on('networkChanged', (chainId: number) => {
        window.reloadListenerSet = true
        window.location.reload()
      })

    return [
      new ethers.providers.Web3Provider(window.ethereum),
      window.ethereum.networkVersion
    ]
  }

  throw new Error('No web3 injection detected')
}
