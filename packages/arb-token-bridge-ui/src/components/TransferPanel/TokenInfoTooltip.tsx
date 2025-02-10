import { ERC20BridgeToken } from '../../hooks/arbTokenBridge.types'
import { useNetworks } from '../../hooks/useNetworks'
import { useNetworksRelationship } from '../../hooks/useNetworksRelationship'
import { Tooltip } from '../common/Tooltip'
import { TokenLogo } from './TokenLogo'
import { useNativeCurrency } from '../../hooks/useNativeCurrency'
import { ExternalLink } from '../common/ExternalLink'
import { shortenAddress } from '../../util/CommonUtils'
import { getExplorerUrl } from '../../util/networks'
import { ChainId } from '../../types/ChainId'
import { isTokenNativeUSDC } from '../../util/TokenUtils'
import { getTransferMode } from '../../util/getTransferMode'

export function BlockExplorerTokenLink({
  chainId,
  address
}: {
  chainId: ChainId
  address: string | undefined
}) {
  if (typeof address === 'undefined') {
    return null
  }

  return (
    <ExternalLink
      href={`${getExplorerUrl(chainId)}/token/${address}`}
      className="arb-hover text-xs underline"
      onClick={e => e.stopPropagation()}
    >
      {shortenAddress(address).toLowerCase()}
    </ExternalLink>
  )
}

export const TokenInfoTooltip = ({
  token
}: {
  token: ERC20BridgeToken | null
}) => {
  const [networks] = useNetworks()
  const { childChainProvider } = useNetworksRelationship(networks)
  const childChainNativeCurrency = useNativeCurrency({
    provider: childChainProvider
  })
  const transferMode = getTransferMode({
    sourceChainId: networks.sourceChain.id,
    destinationChainId: networks.destinationChain.id
  })

  if (!token || isTokenNativeUSDC(token.address)) {
    return <span>{token?.symbol ?? childChainNativeCurrency.symbol}</span>
  }

  const tokenAddress =
    transferMode === 'deposit' || transferMode === 'teleport'
      ? token.l2Address
      : token.address

  return (
    <Tooltip
      wrapperClassName="underline cursor-pointer"
      theme="dark"
      content={
        <div className="flex items-center space-x-2">
          <TokenLogo srcOverride={token.logoURI} className="h-7 w-7" />
          <div className="flex flex-col">
            <div className="flex space-x-1">
              <span className="text-lg font-normal">{token.symbol}</span>
              <span className="pt-[4px] text-xs font-normal text-gray-400">
                {token.name}
              </span>
            </div>
            <BlockExplorerTokenLink
              chainId={networks.destinationChain.id}
              address={tokenAddress}
            />
          </div>
        </div>
      }
      tippyProps={{
        arrow: false,
        interactive: true
      }}
    >
      <ExternalLink
        href={`${getExplorerUrl(
          networks.destinationChain.id
        )}/token/${tokenAddress}`}
      >
        {token.symbol}
      </ExternalLink>
    </Tooltip>
  )
}
