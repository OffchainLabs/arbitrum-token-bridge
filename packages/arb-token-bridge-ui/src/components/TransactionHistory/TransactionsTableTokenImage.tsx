import EthereumLogoRoundLight from '@/images/EthereumLogoRoundLight.svg'
import Image from 'next/image'

import { useTokenLists } from '../../hooks/useTokenLists'
import { MergedTransaction } from '../../state/app/state'
import { orbitChains } from '../../util/orbitChainsList'
import { AssetType } from '../../hooks/arbTokenBridge.types'
import { TokenListWithId } from '../../util/TokenListUtils'

function createTokenLogoMapFromTokenLists(
  tokenLists: TokenListWithId[] | undefined
) {
  if (!tokenLists) {
    return {}
  }
  const arrayOfTokens = tokenLists.flatMap(tkn => tkn.tokens) || []
  return arrayOfTokens.reduce((acc, tkn) => {
    acc[tkn.address.toLowerCase()] = tkn.logoURI
    return acc
  }, {} as { [key in string]: string | undefined })
}

export const TransactionsTableTokenImage = ({
  tx
}: {
  tx: MergedTransaction
}) => {
  // we need to take token image from mainnet by symbol, some token images don't exists on other networks
  const tokenLists = useTokenLists(tx.sourceChainId)

  const tokenAddressToLogoSrcMap = createTokenLogoMapFromTokenLists(
    tokenLists.data
  )

  const tokenLogoSrc = tx.tokenAddress
    ? tokenAddressToLogoSrcMap[tx.tokenAddress.toLowerCase()]
    : undefined

  if (tx.assetType === AssetType.ETH) {
    const orbitChain = orbitChains[tx.childChainId]

    const nativeTokenLogoSrc =
      orbitChain?.bridgeUiConfig.nativeTokenData?.logoUrl

    if (nativeTokenLogoSrc) {
      return (
        // we use img in case native token logos are imported from an external source
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className="w-[20px]"
          alt="Native token logo"
          src={nativeTokenLogoSrc}
        />
      )
    }

    return (
      <Image
        height={20}
        width={20}
        alt="ETH logo"
        src={EthereumLogoRoundLight}
      />
    )
  }

  if (!tokenLogoSrc) {
    return <div className="h-[20px] w-[20px] rounded-full bg-white/20" />
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img className="w-[20px]" alt={tx.asset + ' logo'} src={tokenLogoSrc} />
  )
}
