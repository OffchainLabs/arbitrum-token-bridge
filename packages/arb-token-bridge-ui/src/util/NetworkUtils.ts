import { hexValue } from 'ethers/lib/utils'
import { ChainId, getNetworkName, rpcURLs, getExplorerUrl } from './networks'
import { BigNumber } from 'ethers'
import { Web3Provider } from '@ethersproject/providers'
import EthereumLogo from '../assets/EthereumLogo.png'
import ArbitrumOneLogo from '../assets/ArbitrumOneLogo.svg'
import ArbitrumNovaLogo from '../assets/ArbitrumNovaLogo.png'
import { UseNetworksAndSignersConnectedResult } from '../hooks/useNetworksAndSigners'

/* 
  The list which will be available for network selection in navbar-dropdowns
 */
export const supportedNetworks = [
  ChainId.ArbitrumOne,
  ChainId.ArbitrumNova,
  ChainId.Mainnet
]

/* 
  Icons and colors attached with our networks available for selection
*/
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

export type SwitchChainProps = {
  chainId: ChainId
  provider: Web3Provider
  onSuccess?: () => void
  onError?: (err?: Error) => void
  onSwitchChainNotSupported?: () => void
}

const noop = () => {}

const isSwitchChainSupported = (provider: Web3Provider) =>
  provider?.provider &&
  //@ts-ignore
  (provider.provider.isMetaMask || provider.provider.isImToken)

// typescript issue here
const onSwitchChainNotSupported = (
  chainId: ChainId,
  networksAndSigners: UseNetworksAndSignersConnectedResult
) => {
  // if no `wallet_switchEthereumChain` support
  const networkName = getNetworkName(chainId)

  console.log(
    'Not sure if current provider supports wallet_switchEthereumChain'
  )
  // TODO: show user a nice dialogue box instead of
  // eslint-disable-next-line no-alert
  const targetTxName = networksAndSigners.isConnectedToArbitrum
    ? 'deposit'
    : 'withdraw'

  alert(
    `Please connect to ${networkName} to ${targetTxName}; make sure your wallet is connected to ${networkName} when you are signing your ${targetTxName} transaction.`
  )
  // TODO: reset state so user can attempt to press "Deposit" again
}

export async function switchChain({
  chainId,
  provider,
  onSuccess = noop,
  onError = noop,
  onSwitchChainNotSupported = noop
}: SwitchChainProps) {
  if (isSwitchChainSupported(provider)) {
    // if all the above conditions are satisfied go ahead and switch the network
    const hexChainId = hexValue(BigNumber.from(chainId))
    const networkName = getNetworkName(chainId)

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
            rpcUrls: [rpcURLs[chainId]],
            blockExplorerUrls: [getExplorerUrl(chainId)]
          }
        ])

        onSuccess?.()
      } else {
        onError?.(err)
        throw err
      }
    }
  } else {
    onSwitchChainNotSupported?.()
  }
}
