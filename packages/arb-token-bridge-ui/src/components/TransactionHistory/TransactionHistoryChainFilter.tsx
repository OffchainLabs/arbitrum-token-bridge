import { useCallback, useState } from 'react'

import { useTransactionHistory } from '../../hooks/useTransactionHistory'
import { ChainId, getNetworkName } from '../../util/networks'
import { Checkbox } from '../common/Checkbox'
import { NetworkImage } from '../common/NetworkImage'
import {
  FilterType,
  FiltersStorage,
  useTransactionHistoryFilters
} from '../../hooks/useTransactionHistoryFilters'
import { Button } from '../common/Button'

export const TransactionHistoryChainFilter = ({
  type,
  address,
  onApply
}: {
  type: FilterType
  address: `0x${string}` | undefined
  onApply: () => void
}) => {
  const { chainIdsWithAtLeastOneTx } = useTransactionHistory(address)
  const [filtersStorage, setFiltersStorage] =
    useTransactionHistoryFilters(address)
  const [newFiltersStorage, setNewFiltersStorage] =
    useState<FiltersStorage>(filtersStorage)

  const isSourceChain = type === FilterType.HiddenSourceChains

  const filterableChainIds =
    chainIdsWithAtLeastOneTx[isSourceChain ? 'source' : 'destination'] || []

  const hiddenChainIds =
    (isSourceChain
      ? newFiltersStorage.hidden_source_chains
      : newFiltersStorage.hidden_destination_chains) || []

  const handleSetNewFilters = useCallback(
    ({ chainId, value }: { chainId: ChainId; value: boolean }) => {
      setNewFiltersStorage(prevFilters => {
        let newFilters =
          (isSourceChain
            ? prevFilters.hidden_source_chains
            : prevFilters.hidden_destination_chains) || []

        if (value) {
          // remove chain from the list
          newFilters = newFilters.filter(c => c !== chainId)
        } else {
          // add chain to the list
          newFilters.push(chainId)
        }

        return {
          hidden_source_chains: isSourceChain
            ? newFilters
            : prevFilters.hidden_source_chains,
          hidden_destination_chains: isSourceChain
            ? prevFilters.hidden_destination_chains
            : newFilters
        }
      })
    },
    [isSourceChain, setNewFiltersStorage]
  )

  const handleApplyFilters = useCallback(() => {
    setFiltersStorage(newFiltersStorage)
    onApply()
  }, [newFiltersStorage, setFiltersStorage, onApply])

  return (
    <div className="mt-1 rounded border border-white/20 bg-dark shadow shadow-white">
      <div className="max-h-[285px] overflow-y-auto">
        {filterableChainIds.map(chainId => (
          <div className="flex items-center p-4" key={chainId}>
            <Checkbox
              label={
                <div className="arb-hover flex items-center space-x-2">
                  <NetworkImage chainId={chainId} />
                  <span>{getNetworkName(chainId)}</span>
                </div>
              }
              checked={!hiddenChainIds.includes(chainId)}
              onChange={value => handleSetNewFilters({ chainId, value })}
            />
          </div>
        ))}
      </div>
      <div className="p-2">
        <Button
          variant="secondary"
          className="w-full rounded border border-white p-2 text-xs text-white"
          onClick={handleApplyFilters}
        >
          Apply
        </Button>
      </div>
    </div>
  )
}
