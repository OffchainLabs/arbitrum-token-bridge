import { useEffect, useState } from 'react'
import { Provider } from '@ethersproject/providers'

export function useBlockNumber(provider?: Provider) {
  const [blockNumber, setBlockNumber] = useState(0)

  useEffect(() => {
    if (typeof provider === 'undefined') {
      return
    }

    provider.on('block', setBlockNumber)

    return () => {
      provider.off('block', setBlockNumber)
    }
  }, [provider])

  return blockNumber
}
