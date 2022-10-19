import { L1Network, L2Network } from '@arbitrum/sdk'
import { hexValue } from 'ethers/lib/utils'
import { ChainId, getNetworkName, rpcURLs } from './networks'
import { BigNumber } from 'ethers'
import { Web3Provider } from '@ethersproject/providers'
import EthereumLogo from '../assets/EthereumLogo.png'
import ArbitrumOneLogo from '../assets/ArbitrumOneLogo.svg'
import ArbitrumNovaLogo from '../assets/ArbitrumNovaLogo.png'


export const networkStyleMap: {
  [chainId: number]: { img: string; btnThemeClass: string }
} = {
  [ChainId.Mainnet]: {
    img: EthereumLogo,
    btnThemeClass: 'bg-blue-arbitrum'
  },
  [ChainId.ArbitrumOne]: {
    img: ArbitrumOneLogo,
    btnThemeClass: 'bg-blue-arbitrum'
  },
  [ChainId.ArbitrumNova]: {
    img: ArbitrumNovaLogo,
    btnThemeClass: 'bg-brick-dark'
  }
}



/*
  - A very basic variant of `changeNetwork` function present in App.tsx (which initializes after the app load)
  - The original App-injected version requires a network connection already
  - This lightweight function doesn't require a connected network - simply switches the metamask network
  - But it doesn't support very rich business logic as well, like showing custom alerts if user is connected to `Arbitrum` or not
*/
export const changeNetworkBasic = async (
  provider: Web3Provider | undefined,
  network: L1Network | L2Network,
  onSuccess?: () => void,
  onError?: (err?: any) => void
) => {
  const chainId = network.chainID
  const hexChainId = hexValue(BigNumber.from(chainId))
  const networkName = getNetworkName(network)

  if (provider) {
    console.log('Attempting to switch to chain', chainId)
    try {
      await provider.send('wallet_switchEthereumChain', [
        {
          chainId: hexChainId
        }
      ])

      onSuccess?.()
    } catch (err: any) {
      if (err.code === 4902) {
        console.log(`Network ${chainId} not yet added to wallet; adding now:`)
        await provider.send('wallet_addEthereumChain', [
          {
            chainId: hexChainId,
            chainName: networkName,
            nativeCurrency: {
              name: 'Ether',
              symbol: 'ETH',
              decimals: 18
            },
            rpcUrls: [rpcURLs[network.chainID]],
            blockExplorerUrls: [network.explorerUrl]
          }
        ])

        onSuccess?.()
      } else {
        onError?.(err)
        throw err
      }
    }
  } else {
    // if no `wallet_switchEthereumChain` support
    console.log(
      'Not sure if current provider supports wallet_switchEthereumChain'
    )
    onError?.()
  }
}
