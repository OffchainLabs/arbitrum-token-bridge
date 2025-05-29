import { expect, it } from 'vitest'

import { ChainId } from '../../types/ChainId'
import { getRpcUrl } from './getRpcUrl'

it('returns correct rpc for ethereum mainnet (infura)', () => {
  expect(getRpcUrl(ChainId.Ethereum, 'infura', 'infura-key')).toEqual(
    'https://mainnet.infura.io/v3/infura-key'
  )
})

it('returns correct rpc for arbitrum nova (infura)', () => {
  expect(getRpcUrl(ChainId.ArbitrumNova, 'infura', 'infura-key')).toEqual(
    'https://nova.arbitrum.io/rpc'
  )
})

it('returns correct rpc for ethereum mainnet (alchemy)', () => {
  expect(getRpcUrl(ChainId.Ethereum, 'alchemy', 'alchemy-key')).toEqual(
    'https://eth-mainnet.g.alchemy.com/v2/alchemy-key'
  )
})

it('returns correct rpc for arbitrum nova (alchemy)', () => {
  expect(getRpcUrl(ChainId.ArbitrumNova, 'alchemy', 'alchemy-key')).toEqual(
    'https://arbnova-mainnet.g.alchemy.com/v2/alchemy-key'
  )
})
