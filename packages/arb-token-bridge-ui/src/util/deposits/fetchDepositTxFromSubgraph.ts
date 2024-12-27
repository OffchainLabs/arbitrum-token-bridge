import { getArbitrumNetwork } from '@arbitrum/sdk'
import { Address } from 'wagmi'

import { ChainId } from '../networks'

import { getProviderForChainId } from '@/token-bridge-sdk/utils'
import { fetchDeposits } from './fetchDeposits'
import { transformTransaction } from '../../hooks/useTransactionHistory'
import { MergedTransaction } from '../../state/app/state'

/**
 * Fetches initiated ETH deposit from event logs using transaction id
 *
 * @param txHash transaction id on parent chain
 */
export async function fetchDepositByTxHash(
  txHash: string,
  connectedAddress: Address
): Promise<MergedTransaction[]> {
  // TODO: accept child chain id as an arg of the function
  const childChainId = ChainId.ArbitrumSepolia
  const childChain = getArbitrumNetwork(childChainId)

  const parentProvider = getProviderForChainId(childChain.parentChainId)
  const childProvider = getProviderForChainId(childChainId)

  try {
    const deposits = await fetchDeposits({
      sender: connectedAddress,
      l1Provider: parentProvider,
      l2Provider: childProvider,
      searchString: txHash
    })
    console.log('deposits: ', deposits)

    const transformedDeposits = await Promise.all(
      deposits.map(transformTransaction)
    )

    console.log('transformedDeposits: ', transformedDeposits)

    return transformedDeposits
  } catch (error) {
    console.error('Error fetching deposits by tx hash: ', error)
  }

  return []
}
