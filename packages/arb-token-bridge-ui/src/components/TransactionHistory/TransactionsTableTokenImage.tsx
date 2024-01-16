import { useMemo } from 'react'
import Image from 'next/image'
import EthereumLogoRoundLight from '@/images/EthereumLogoRoundLight.svg'

import { useTokenLists } from '../../hooks/useTokenLists'
import { ChainId } from '../../util/networks'
import { ether } from '../../constants'

export const TransactionsTableTokenImage = ({
  tokenSymbol
}: {
  tokenSymbol: string
}) => {
  // we need to take token image from mainnet by symbol, some token images don't exists on other networks
  const tokenLists = useTokenLists(ChainId.ArbitrumOne)

  const allTokens = useMemo(() => {
    return tokenLists.data?.map(t => t.tokens).flat() || []
  }, [tokenLists])

  const token = useMemo(() => {
    return allTokens.find(
      t => t.symbol.toLowerCase() === tokenSymbol.toLowerCase()
    )
  }, [allTokens, tokenSymbol])

  if (tokenSymbol.toLowerCase() === ether.symbol.toLowerCase()) {
    return (
      <Image
        height={20}
        width={20}
        alt="ETH logo"
        src={EthereumLogoRoundLight}
      />
    )
  }

  if (!token || !token.logoURI) {
    return <div className="h-[20px] w-[20px] rounded-full bg-white/20" />
  }

  return (
    // SafeImage is used for token logo, we don't know at buildtime where those images will be loaded from
    // It would throw error if it's loaded from external domains
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className="h-[20px]"
      alt={token.symbol + ' logo'}
      src={token.logoURI}
    />
  )
}
