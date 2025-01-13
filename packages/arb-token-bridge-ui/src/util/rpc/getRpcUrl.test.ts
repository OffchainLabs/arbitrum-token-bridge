import { ChainId } from '../../types/ChainId'
import { getRpcUrl } from './getRpcUrl'
import { getInfuraRpcUrl, InfuraSupportedChainId } from './infura'

it('(infura) returns rpc for ethereum mainnet', () => {
  expect(getRpcUrl(1, 'infura', '123456')).toEqual(
    'https://mainnet.infura.io/v3/123456'
  )
})

it('(infura) returns public rpc for arbitrum nova', () => {
  expect(getRpcUrl(ChainId.ArbitrumNova, 'infura', '654321')).toEqual(
    'https://nova.arbitrum.io/rpc'
  )
})

it('(alchemy) returns rpc for ethereum mainnet', () => {
  expect(getRpcUrl(1, 'alchemy', '123456')).toEqual(
    'https://eth-mainnet.g.alchemy.com/v2/123456'
  )
})
