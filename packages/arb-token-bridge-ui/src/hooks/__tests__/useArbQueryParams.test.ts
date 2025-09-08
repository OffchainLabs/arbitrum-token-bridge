import { describe, it, expect } from 'vitest'
import { registerCustomArbitrumNetwork } from '@arbitrum/sdk'
import { customChainLocalStorageKey } from '../../util/networks'
import { ChainId } from '../../types/ChainId'
import {
  AmountQueryParam,
  ChainParam,
  TabParam,
  DisabledFeatures,
  DisabledFeaturesParam
} from '../useArbQueryParams'
import { createMockOrbitChain } from './helpers'
import {
  sanitizeTabQueryParam,
  sanitizeTokenQueryParam
} from '../../util/queryParamUtils'

describe('AmountQueryParam custom encoder and decoder', () => {
  describe('encode input field value to query param', () => {
    // input[type="text"] allows any character
    // we allow both dot and comma for decimal separator

    const getEncodeResult = (value: string) => AmountQueryParam.encode(value)

    it('should return input field value after encoding', () => {
      expect(getEncodeResult('10234')).toEqual('10234')
      expect(getEncodeResult('12')).toEqual('12')

      expect(getEncodeResult('1.0234')).toEqual('1.0234')
      expect(getEncodeResult('0.0234')).toEqual('0.0234')
      expect(getEncodeResult('0.0')).toEqual('0.0')
      expect(getEncodeResult('0')).toEqual('0')
      expect(getEncodeResult('0.000')).toEqual('0.000')

      expect(getEncodeResult('1,0234')).toEqual('1.0234')
      expect(getEncodeResult('0,0234')).toEqual('0.0234')
      expect(getEncodeResult('0,0')).toEqual('0.0')
      expect(getEncodeResult('0,000')).toEqual('0.000')

      expect(getEncodeResult('1e1')).toEqual('1e1')
      expect(getEncodeResult('1.0234e4')).toEqual('1.0234e4')
      expect(getEncodeResult('1.0234e-4')).toEqual('1.0234e-4')
      expect(getEncodeResult('1,0234e4')).toEqual('1.0234e4')
      expect(getEncodeResult('1,0234e-4')).toEqual('1.0234e-4')

      expect(getEncodeResult('max')).toEqual('max')
      expect(getEncodeResult('mAx')).toEqual('max')
      expect(getEncodeResult('MAX')).toEqual('max')
      expect(getEncodeResult('MAx')).toEqual('max')
    })

    it('should return the absolute positive value after encoding', () => {
      expect(getEncodeResult('-0.234')).toEqual('0.234')
      expect(getEncodeResult('-0,234')).toEqual('0.234')
      expect(getEncodeResult('-0')).toEqual('0')
      expect(getEncodeResult('-0.123123')).toEqual('0.123123')
      expect(getEncodeResult('-0,123123')).toEqual('0.123123')
      expect(getEncodeResult('-1')).toEqual('1')
      expect(getEncodeResult('-10')).toEqual('10')
    })

    it('should return an empty string after encoding', () => {
      // these should never come into encode from the input[type=number]
      // but the tests are here in case we change the input type in the future
      expect(getEncodeResult('random')).toEqual('')
      expect(getEncodeResult('null')).toEqual('')
      expect(getEncodeResult('1dfk')).toEqual('')
      expect(getEncodeResult('da24')).toEqual('')

      // these should never come into encode from the input[type=number]
      // but the tests are here in case we change the input type in the future
      expect(getEncodeResult('1.23.0')).toEqual('')
      expect(getEncodeResult('1,23,0')).toEqual('')
      expect(getEncodeResult('0,null,123')).toEqual('')
      expect(getEncodeResult('some, text')).toEqual('')

      // it's a quirk of the number field that these won't trigger a value change
      // although the function handles these, if these were input,
      // the value of the input will instantly become an empty string, at least it does on Chrome on Mac
      expect(getEncodeResult('12--32123-32')).toEqual('')
      expect(getEncodeResult('--10.23')).toEqual('')
      expect(getEncodeResult('')).toEqual('')
    })

    it('should return formatted value after encoding', () => {
      expect(getEncodeResult('00.001')).toEqual('0.001')
      expect(getEncodeResult('0000')).toEqual('0')
      expect(getEncodeResult('00.000')).toEqual('0.000')
      expect(getEncodeResult('.1')).toEqual('0.1')
      expect(getEncodeResult('00002.123')).toEqual('2.123')
      expect(getEncodeResult('.0234')).toEqual('0.0234')
      expect(getEncodeResult('123.123000')).toEqual('123.123000')

      expect(getEncodeResult('00,001')).toEqual('0.001')
      expect(getEncodeResult('00,000')).toEqual('0.000')
      expect(getEncodeResult(',1')).toEqual('0.1')
      expect(getEncodeResult('00002,123')).toEqual('2.123')
      expect(getEncodeResult(',0234')).toEqual('0.0234')
      expect(getEncodeResult('123,123000')).toEqual('123.123000')
    })
  })

  describe('decode query param to input field value', () => {
    const getDecodeResult = (value: string) => AmountQueryParam.decode(value)

    it('should return the original value after decoding', () => {
      expect(getDecodeResult('10234')).toEqual('10234')
      expect(getDecodeResult('12')).toEqual('12')

      expect(getDecodeResult('1.0234')).toEqual('1.0234')
      expect(getDecodeResult('0.0234')).toEqual('0.0234')
      expect(getDecodeResult('0.0')).toEqual('0.0')
      expect(getDecodeResult('0')).toEqual('0')
      expect(getDecodeResult('0.000')).toEqual('0.000')

      expect(getDecodeResult('1,0234')).toEqual('1.0234')
      expect(getDecodeResult('0,0234')).toEqual('0.0234')
      expect(getDecodeResult('0,0')).toEqual('0.0')
      expect(getDecodeResult('0,000')).toEqual('0.000')

      expect(getDecodeResult('1e1')).toEqual('1e1')
      expect(getDecodeResult('1.0234e4')).toEqual('1.0234e4')
      expect(getDecodeResult('1.0234e-4')).toEqual('1.0234e-4')
      expect(getDecodeResult('1,0234e4')).toEqual('1.0234e4')
      expect(getDecodeResult('1,0234e-4')).toEqual('1.0234e-4')

      expect(getDecodeResult('max')).toEqual('max')
      expect(getDecodeResult('mAx')).toEqual('max')
      expect(getDecodeResult('MAX')).toEqual('max')
      expect(getDecodeResult('MAx')).toEqual('max')
    })

    it('should return the absolute positive value after decoding', () => {
      expect(getDecodeResult('-0.234')).toEqual('0.234')
      expect(getDecodeResult('-0')).toEqual('0')
      expect(getDecodeResult('-0.123123')).toEqual('0.123123')
      expect(getDecodeResult('-1')).toEqual('1')
      expect(getDecodeResult('-10')).toEqual('10')

      expect(getDecodeResult('-0,234')).toEqual('0.234')
      expect(getDecodeResult('-0,123123')).toEqual('0.123123')
    })

    it('should return an empty string after decoding', () => {
      expect(getDecodeResult('random')).toEqual('')
      expect(getDecodeResult('null')).toEqual('')
      expect(getDecodeResult('1dfk')).toEqual('')
      expect(getDecodeResult('da24')).toEqual('')

      expect(getDecodeResult('1,23,0')).toEqual('')
      expect(getDecodeResult('1.23.0')).toEqual('')
      expect(getDecodeResult('0,null,123')).toEqual('')
      expect(getDecodeResult('some, text')).toEqual('')

      expect(getDecodeResult('12--32123-32')).toEqual('')
      expect(getDecodeResult('--10.23')).toEqual('')
      expect(getDecodeResult('')).toEqual('')
    })

    it('should return formatted value after encoding', () => {
      expect(getDecodeResult('00.001')).toEqual('0.001')
      expect(getDecodeResult('0000')).toEqual('0')
      expect(getDecodeResult('00.000')).toEqual('0.000')
      expect(getDecodeResult('.1')).toEqual('0.1')
      expect(getDecodeResult('00002.123')).toEqual('2.123')
      expect(getDecodeResult('.0234')).toEqual('0.0234')
      expect(getDecodeResult('123.123000')).toEqual('123.123000')

      expect(getDecodeResult('00,001')).toEqual('0.001')
      expect(getDecodeResult('00,000')).toEqual('0.000')
      expect(getDecodeResult(',1')).toEqual('0.1')
      expect(getDecodeResult('00002,123')).toEqual('2.123')
      expect(getDecodeResult(',0234')).toEqual('0.0234')
      expect(getDecodeResult('123,123000')).toEqual('123.123000')
    })
  })
})

describe('ChainParam custom encoder and decoder', () => {
  describe('encode chainId to chainId/ChainQueryParam', () => {
    it('should return undefined if value is null or undefined', () => {
      expect(ChainParam.encode(null)).toBeUndefined()
      expect(ChainParam.encode(undefined)).toBeUndefined()
    })

    it('should return ChainQueryParam if value is a valid chainId', () => {
      expect(ChainParam.encode(ChainId.Ethereum)).toEqual('ethereum')
      expect(ChainParam.encode(ChainId.ArbitrumOne)).toEqual('arbitrum-one')
      expect(ChainParam.encode(ChainId.Sepolia)).toEqual('sepolia')
      expect(ChainParam.encode(ChainId.ArbitrumSepolia)).toEqual(
        'arbitrum-sepolia'
      )
      expect(ChainParam.encode(1234567890)).toBeUndefined()
      localStorage.setItem(
        customChainLocalStorageKey,
        JSON.stringify([
          { chainID: '1111111111', name: 'custom 1111111111 chain' }
        ])
      )
      expect(ChainParam.encode(1111111111)).toEqual('1111111111')
      localStorage.clear()
    })
  })

  describe('decode chainId/ChainQueryParam to chainId', () => {
    it('should return undefined if value is null or undefined', () => {
      expect(ChainParam.decode(null)).toBeUndefined()
      expect(ChainParam.decode(undefined)).toBeUndefined()
    })

    it('should decode to ChainId if value is a valid ChainQueryParam', () => {
      expect(ChainParam.decode('ethereum')).toEqual(ChainId.Ethereum)
      expect(ChainParam.decode('arbitrum-one')).toEqual(ChainId.ArbitrumOne)
      expect(ChainParam.decode('sepolia')).toEqual(ChainId.Sepolia)
      expect(ChainParam.decode('arbitrum-sepolia')).toEqual(
        ChainId.ArbitrumSepolia
      )
      expect(ChainParam.decode('aaa123')).toBeUndefined()
    })

    it('should decode to ChainId if value is a valid chainId', () => {
      function decodeChainId(value: ChainId) {
        return ChainParam.decode(value.toString())
      }
      expect(decodeChainId(ChainId.Ethereum)).toEqual(ChainId.Ethereum)
      expect(decodeChainId(ChainId.ArbitrumOne)).toEqual(ChainId.ArbitrumOne)
      expect(decodeChainId(ChainId.Sepolia)).toEqual(ChainId.Sepolia)
      expect(decodeChainId(ChainId.ArbitrumSepolia)).toEqual(
        ChainId.ArbitrumSepolia
      )
      expect(ChainParam.decode('1234567890')).toBeUndefined()
      const customChain = createMockOrbitChain({
        chainId: 222222,
        parentChainId: 1
      })
      registerCustomArbitrumNetwork(customChain)
      expect(ChainParam.decode('222222')).toEqual(222222)
    })
  })
})

describe('TabParam custom encoder and decoder', () => {
  describe('encode tab index number to string query param', () => {
    it('should return bridge tab string if value is null or undefined', () => {
      expect(TabParam.encode(null)).toEqual('bridge')
      expect(TabParam.encode(undefined)).toEqual('bridge')
    })

    it('should return string query param if value is a valid tab index number', () => {
      expect(TabParam.encode(0)).toEqual('bridge')
      expect(TabParam.encode(1)).toEqual('tx_history')
    })

    it('should return bridge tab string if value is an invalid tab index number', () => {
      expect(TabParam.encode(2)).toEqual('bridge')
      expect(TabParam.encode(3)).toEqual('bridge')
      expect(TabParam.encode(3111111)).toEqual('bridge')
      expect(TabParam.encode(-1)).toEqual('bridge')
      expect(TabParam.encode(-129)).toEqual('bridge')
    })

    it('should return bridge tab string if value is an invalid string', () => {
      // @ts-ignore - test invalid values
      expect(TabParam.encode('xxx')).toEqual('bridge')
      // @ts-ignore - test invalid values
      expect(TabParam.encode('random text')).toEqual('bridge')
      // @ts-ignore - test invalid values
      // we are encoding the selected tab index number to string; `tx_history` is not a valid tab index number
      expect(TabParam.encode('tx_history')).toEqual('bridge')
    })
  })

  describe('decode string query param to tab index number', () => {
    it('should return 0 (bridge index number) if value is null or undefined', () => {
      expect(TabParam.decode(null)).toEqual(0)
      expect(TabParam.decode(undefined)).toEqual(0)
    })

    it('should return bridge tab index number if value is an invalid string query param', () => {
      expect(TabParam.decode('')).toEqual(0)
      expect(TabParam.decode('random')).toEqual(0)
      expect(TabParam.decode('random text here')).toEqual(0)
      expect(TabParam.decode('2')).toEqual(0)
      expect(TabParam.decode('3')).toEqual(0)
      expect(TabParam.decode('3111111')).toEqual(0)
      expect(TabParam.decode('000000')).toEqual(0)
      expect(TabParam.decode('0')).toEqual(0)
      expect(TabParam.decode('1')).toEqual(0)
    })

    it('should return corresponding tab index number if string query param is valid', () => {
      expect(TabParam.decode('bridge')).toEqual(0)
      expect(TabParam.decode('tx_history')).toEqual(1)
    })
  })
})

describe('sanitizeTokenQueryParam', () => {
  describe('when `token=eth` is defined', () => {
    const xaiChainId = 660279

    it('should be kept if the destination chain is an Orbit chain with custom gas token', () => {
      const result = sanitizeTokenQueryParam({
        sourceChainId: ChainId.ArbitrumOne,
        destinationChainId: xaiChainId,
        token: 'eth'
      })
      expect(result).toEqual('eth')
    })

    it('should be case insensitive', () => {
      const result = sanitizeTokenQueryParam({
        sourceChainId: ChainId.ArbitrumOne,
        destinationChainId: xaiChainId,
        token: 'eTH'
      })
      expect(result).toEqual('eth')
    })

    it('should be stripped if the destination chain is a core chain with ETH as the gas token', () => {
      const result = sanitizeTokenQueryParam({
        sourceChainId: ChainId.ArbitrumOne,
        destinationChainId: ChainId.ArbitrumOne,
        token: 'eth'
      })
      expect(result).toBeUndefined()
    })

    it('should be stripped if the destination chain is an Orbit chain with ETH as the gas token', () => {
      const rariChainId = 1380012617

      const result = sanitizeTokenQueryParam({
        sourceChainId: ChainId.ArbitrumOne,
        destinationChainId: rariChainId,
        token: 'eth'
      })
      expect(result).toBeUndefined()
    })
  })
})

describe('sanitizeTabQueryParam', () => {
  it('should be kept if it is a valid tab string value', () => {
    const result1 = sanitizeTabQueryParam('bridge')
    const result2 = sanitizeTabQueryParam('tx_history')

    expect(result1).toEqual('bridge')
    expect(result2).toEqual('tx_history')
  })

  it('should be case insensitive', () => {
    const result1 = sanitizeTabQueryParam('TX_history')
    const result2 = sanitizeTabQueryParam('Tx_HiStoRy')

    expect(result1).toEqual('tx_history')
    expect(result2).toEqual('tx_history')
  })

  it('should default to bridge if the value is invalid', () => {
    const result1 = sanitizeTabQueryParam('0')
    const result2 = sanitizeTabQueryParam('1')
    const result3 = sanitizeTabQueryParam('3')
    const result4 = sanitizeTabQueryParam('tx_HISTORY_')

    expect(result1).toEqual('bridge')
    expect(result2).toEqual('bridge')
    expect(result3).toEqual('bridge')
    expect(result4).toEqual('bridge')
  })
})

describe('DisabledFeaturesParam', () => {
  describe('encode', () => {
    it('should return undefined if features is undefined or empty', () => {
      expect(DisabledFeaturesParam.encode(undefined)).toBeUndefined()
      expect(DisabledFeaturesParam.encode([])).toBeUndefined()
    })

    it('should encode valid features', () => {
      expect(
        DisabledFeaturesParam.encode([
          DisabledFeatures.BATCH_TRANSFERS,
          DisabledFeatures.TX_HISTORY
        ])
      ).toEqual('disabledFeatures=batch-transfers&disabledFeatures=tx-history')
    })
  })

  describe('decode', () => {
    it('should return empty array if value is null or undefined', () => {
      expect(DisabledFeaturesParam.decode(null)).toEqual([])
      expect(DisabledFeaturesParam.decode(undefined)).toEqual([])
    })

    it('should return empty array if no valid features are provided', () => {
      expect(DisabledFeaturesParam.decode('invalid-feature')).toEqual([])
      expect(DisabledFeaturesParam.decode('random_feature')).toEqual([])
      expect(DisabledFeaturesParam.decode('')).toEqual([])
    })

    it('should keep only valid features', () => {
      const result = DisabledFeaturesParam.decode([
        DisabledFeatures.BATCH_TRANSFERS,
        'invalid_feature',
        DisabledFeatures.TX_HISTORY
      ])
      expect(result).toEqual([
        DisabledFeatures.BATCH_TRANSFERS,
        DisabledFeatures.TX_HISTORY
      ])
    })

    it('should handle single valid feature', () => {
      expect(
        DisabledFeaturesParam.decode(DisabledFeatures.BATCH_TRANSFERS)
      ).toEqual([DisabledFeatures.BATCH_TRANSFERS])
    })

    it('should be case insensitive and return canonical case', () => {
      expect(DisabledFeaturesParam.decode('BATCH-TRANSFERS')).toEqual([
        DisabledFeatures.BATCH_TRANSFERS
      ])
    })

    it('should handle mixed case in the same query', () => {
      const result = DisabledFeaturesParam.decode([
        DisabledFeatures.BATCH_TRANSFERS,
        'TX-HISTORY',
        'Batch-Transfers'
      ])
      expect(result).toEqual([
        DisabledFeatures.BATCH_TRANSFERS,
        DisabledFeatures.TX_HISTORY
      ])
    })

    it('should handle invalid URL values', () => {
      expect(DisabledFeaturesParam.decode('disabledFeatures=')).toEqual([])
      expect(DisabledFeaturesParam.decode('?disabledFeatures=')).toEqual([])
      expect(DisabledFeaturesParam.decode('randomInvalidValue')).toEqual([])
    })
  })
})
