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
/*
const onSwitchChainNotSupported = (
  chainId: ChainId,
  networksAndSigners: UseNetworksAndSignersConnectedResult
) => {
  // if no `wallet_switchEthereumChain` support
  const networkName = getNetworkName(chainId)

 
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
*/

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
  } else {
    onSwitchChainNotSupported?.()
  }
}
