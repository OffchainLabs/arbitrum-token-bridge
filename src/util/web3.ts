import * as ethers from 'ethers'

interface InjectedEthereumProvider
  extends ethers.ethers.providers.AsyncSendable {
  enable?: () => Promise<string[]>
  on: any
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

export async function getInjectedWeb3(): Promise<
  ethers.providers.JsonRpcProvider
> {
  console.log('weth', window.ethereum, window.ethereum?.isMetaMask)
  if (web3Injected(window.ethereum)) {
    try {
      ;(await window.ethereum.enable?.()) ??
        console.warn('No window.ethereum.enable function')
    } catch (e) {
      throw new Error('Failed to enable window.ethereum: ' + e.message)
    }

    return new ethers.providers.Web3Provider(window.ethereum)
  }

  throw new Error('No web3 injection detected')
}
