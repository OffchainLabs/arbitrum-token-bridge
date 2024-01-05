import { useMemo } from 'react'
import Image from 'next/image'

import { useTokenLists } from '../../hooks/useTokenLists'
import EthereumLogoRoundLight from '@/images/EthereumLogoRoundLight.svg'
import { ChainId } from '../../util/networks'

export const TransactionsTableTokenImage = ({
  tokenSymbol
}: {
  tokenSymbol: string
}) => {
  const tokenLists = useTokenLists(ChainId.ArbitrumOne)

  const allTokens = useMemo(() => {
    return tokenLists.data?.map(t => t.tokens).flat() || []
  }, [tokenLists])

  const token = useMemo(() => {
    return allTokens.find(
      t => t.symbol.toLowerCase() === tokenSymbol.toLowerCase()
    )
  }, [allTokens, tokenSymbol])

  if (tokenSymbol.toLowerCase() === 'eth') {
    return (
      <Image
        height={20}
        width={20}
        alt="ETH logo"
        src={EthereumLogoRoundLight}
      />
    )
  }

  if (!allTokens) {
    return null
  }

  return (
    <img
      className="h-[20px]"
      alt={token?.symbol + ' logo'}
      src={token?.logoURI}
    />
  )
}
