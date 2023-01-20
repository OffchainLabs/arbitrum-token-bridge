import { useEffect, useState } from 'react'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import { useAppState } from '../../state'
import { MergedTransaction } from '../../state/app/state'
import { useAppContextState } from '../App/AppContext'
import { fetchETHDepositsFromSubgraph } from './fetchEthDepositsFromSubgraph_draft'

export const useDeposits = ({
  searchString,
  pageNumber,
  pageSize
}: {
  searchString?: string
  pageNumber?: number
  pageSize?: number
}) => {
  const {
    app: {
      arbTokenBridge: {
        walletAddress,
        transactions: { setTransactions }
      }
    }
  } = useAppState()

  const { currentL1BlockNumber } = useAppContextState()

  const { l1, l2 } = useNetworksAndSigners()

  const [deposits, setDeposits] = useState<MergedTransaction[]>([])
  const [loading, setLoading] = useState<boolean>(false)

  const fetchAndSetEthDeposits = async () => {
    console.log('**** FETCHING DEPOSITS FOR ****', {
      searchString,
      pageNumber,
      pageSize
    })

    setLoading(true)

    const deposits = await fetchETHDepositsFromSubgraph({
      address: walletAddress,
      fromBlock: 0,
      toBlock: currentL1BlockNumber,
      l1Provider: l1.provider,
      l2Provider: l2.provider,
      searchString,
      pageNumber,
      pageSize
    })

    setTransactions(deposits)

    setLoading(false)
  }

  useEffect(() => {
    //fetch the deposits through subgraph and populate them in state variable
    fetchAndSetEthDeposits()
  }, [walletAddress, searchString, pageNumber, pageSize])

  return { deposits, loading }
}
