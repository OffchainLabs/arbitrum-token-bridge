import { useAccount } from 'wagmi'
import useSWRImmutable from 'swr/immutable'
import { useNetworksAndSigners } from './useNetworksAndSigners'
import { getAPIBaseUrl, sanitizeQueryParams } from '../util'
import { ClaimTransaction } from '../pages/api/claims'
import { transformClaimTransactions } from '../state/app/utils'

const fetchClaims = async ({
  address,
  l1ChainId,
  l2ChainId
}: {
  address: string
  l1ChainId: number
  l2ChainId: number
}) => {
  const urlParams = new URLSearchParams(
    sanitizeQueryParams({
      address,
      l1ChainId,
      l2ChainId
    })
  )
  const response = await fetch(`${getAPIBaseUrl()}/api/claims?${urlParams}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  })
  const claimTransactions: ClaimTransaction[] = (await response.json()).data

  return transformClaimTransactions(claimTransactions)
}

export const useClaims = () => {
  const { l1, l2 } = useNetworksAndSigners()
  const l1ChainId = l1.network.id
  const l2ChainId = l2.network.id

  const { address: walletAddress } = useAccount()

  return useSWRImmutable(
    walletAddress ? ['claims', walletAddress, l1ChainId, l2ChainId] : null,
    ([, _walletAddress, _l1ChainId, _l2ChainId]) =>
      fetchClaims({
        address: _walletAddress,
        l1ChainId: _l1ChainId,
        l2ChainId: _l2ChainId
      })
  )
}
