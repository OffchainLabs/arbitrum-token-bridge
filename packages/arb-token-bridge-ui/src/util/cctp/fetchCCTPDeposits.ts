import { Provider } from '@ethersproject/providers'
import { ChainId } from '../networks'
import { getAPIBaseUrl, sanitizeQueryParams } from '..'

export type FetchDepositParams = {
  walletAddress: string
  l1ChainId: ChainId
}

/* Fetch complete deposits - both ETH and Token deposits from subgraph into one list */
/* Also fills in any additional data required per transaction for our UI logic to work well */
/* TODO : Add event logs as well */
export const fetchCCTPDeposits = async ({
  walletAddress,
  l1ChainId
}: FetchDepositParams): Promise<[]> => {
  const urlParams = new URLSearchParams(
    sanitizeQueryParams({
      walletAddress,
      l1ChainId
    })
  )

  const response = await fetch(
    `${getAPIBaseUrl()}/api/cctp/deposits?${urlParams}`,
    {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    }
  )

  const deposits = (await response.json()).data

  console.log(deposits)
  return []
}
