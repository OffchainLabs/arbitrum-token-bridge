import {
  l1Networks,
  l2Networks
} from '@arbitrum/sdk-nitro/dist/lib/dataEntities/networks'

import { ChainId } from '../../../util/networks'
import { reducer } from '../TransferPanelMainReducer'

const Mainnet = l1Networks[ChainId.Mainnet]
const ArbitrumOne = l2Networks[ChainId.ArbitrumOne]
const ArbitrumNova = l2Networks[ChainId.ArbitrumNova]

describe('TransferPanelMainReducer', () => {
  it('does a thing', () => {
    const initialState = { from: Mainnet, to: ArbitrumOne }
    const result = reducer(initialState, { type: 'swap' })
    expect(result).toEqual({ from: ArbitrumOne, to: Mainnet })
  })
})
