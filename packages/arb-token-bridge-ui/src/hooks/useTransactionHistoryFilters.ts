import { useLocalStorage } from '@uidotdev/usehooks'
import { ChainId } from '../util/networks'

const filtersStorageLocalStorageKey =
  'arbitrum:bridge:transaction:history:filters'

export enum FilterType {
  HiddenSourceChains = 'hidden_source_chains',
  HiddenDestinationChains = 'hidden_destination_chains'
}

export type FiltersStorage = { [key in FilterType]: ChainId[] }

export const useTransactionHistoryFilters = (
  address: `0x${string}` | undefined
) => {
  const storageKeyWithAddress = `${filtersStorageLocalStorageKey}_${address}`

  const [filters, setFilters] = useLocalStorage<FiltersStorage>(
    storageKeyWithAddress,
    {
      [FilterType.HiddenSourceChains]: [],
      [FilterType.HiddenDestinationChains]: []
    }
  )

  return [filters, setFilters] as const
}
