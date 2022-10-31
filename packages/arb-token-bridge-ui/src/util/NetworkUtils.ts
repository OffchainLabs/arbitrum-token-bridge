import { hexValue } from 'ethers/lib/utils'
import { ChainId, getNetworkName, rpcURLs, getExplorerUrl } from './networks'
import { BigNumber } from 'ethers'
import { Web3Provider } from '@ethersproject/providers'
import EthereumLogo from '../assets/EthereumLogo.png'
import ArbitrumOneLogo from '../assets/ArbitrumOneLogo.svg'
import ArbitrumNovaLogo from '../assets/ArbitrumNovaLogo.png'

/* 
  The list which will be available for network selection in navbar-dropdowns plus
  Icons and colors attached with our networks available for selection
*/
export const supportedNetworks: {
  [key in ChainId]?: { img: string; btnThemeClass: string }
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

type ExtendedWeb3Provider = Web3Provider & {
  isMetaMask?: boolean
  isImToken?: boolean
}

export type SwitchChainProps = {
  chainId: ChainId
  provider: ExtendedWeb3Provider
  onSuccess?: () => void
  onError?: (err?: Error) => void
  onSwitchChainNotSupported?: () => void
}

const isSwitchChainSupported = (provider: ExtendedWeb3Provider) => {
  return provider.isMetaMask || provider.isImToken
}

const noop = () => {}

export async function switchChain({
  chainId,
  provider,
  onSuccess = noop,
  onError = noop,
  onSwitchChainNotSupported = noop
}: SwitchChainProps) {
  // do an early return if switching-chains is not supported by provider
  if (!isSwitchChainSupported(provider)) {
    onSwitchChainNotSupported?.()
    return
  }

  // if all the above conditions are satisfied go ahead and switch the network
  const hexChainId = hexValue(BigNumber.from(chainId))
  const networkName = getNetworkName(chainId)

  try {
    await provider.send('wallet_switchEthereumChain', [
      {
        chainId: hexChainId
      }
    ])

    onSuccess?.()
  } catch (err: any) {
    if (err.code === 4902) {
      // https://docs.metamask.io/guide/rpc-api.html#usage-with-wallet-switchethereumchain
      // This error code indicates that the chain has not been added to MetaMask.
      await provider.send('wallet_addEthereumChain', [
        {
          chainId: hexChainId,
          chainName: networkName,
          nativeCurrency: {
            name: 'Ether',
            symbol: 'ETH',
            decimals: 18
          },
          rpcUrls: [rpcURLs[chainId]],
          blockExplorerUrls: [getExplorerUrl(chainId)]
        }
      ])

      onSuccess?.()
    } else {
      onError?.(err)
    }
  }
}
