import useSWRImmutable from 'swr/immutable'
import { useActions } from '../state'

export function useWarningTokensList() {
  const {
    app: { setWarningTokens }
  } = useActions()

  return useSWRImmutable(
    'https://raw.githubusercontent.com/OffchainLabs/arb-token-lists/aff40a59608678cfd9b034dd198011c90b65b8b6/src/WarningList/warningTokens.json',
    async url => {
      const tokenList = await fetch(url).then(response => response.json())
      setWarningTokens(tokenList)
      return tokenList
    }
  )
}
