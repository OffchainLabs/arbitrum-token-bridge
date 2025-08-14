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
import { sanitizeTabQueryParam, sanitizeTokenQueryParam } from '../../pages'

describe('AmountQueryParam custom parser and serializer', () => {
  describe('serialize input field value to query param', () => {
    // input[type="text"] allows any character
    // we allow both dot and comma for decimal separator

    const getSerializedResult = (value: string) =>
      AmountQueryParam.serialize(value)

    it('should return input field value after encoding', () => {
      expect(getSerializedResult('10234')).toEqual('10234')
      expect(getSerializedResult('12')).toEqual('12')

      expect(getSerializedResult('1.0234')).toEqual('1.0234')
      expect(getSerializedResult('0.0234')).toEqual('0.0234')
      expect(getSerializedResult('0.0')).toEqual('0.0')
      expect(getSerializedResult('0')).toEqual('0')
      expect(getSerializedResult('0.000')).toEqual('0.000')

      expect(getSerializedResult('1,0234')).toEqual('1.0234')
      expect(getSerializedResult('0,0234')).toEqual('0.0234')
      expect(getSerializedResult('0,0')).toEqual('0.0')
      expect(getSerializedResult('0,000')).toEqual('0.000')

      expect(getSerializedResult('1e1')).toEqual('1e1')
      expect(getSerializedResult('1.0234e4')).toEqual('1.0234e4')
      expect(getSerializedResult('1.0234e-4')).toEqual('1.0234e-4')
      expect(getSerializedResult('1,0234e4')).toEqual('1.0234e4')
      expect(getSerializedResult('1,0234e-4')).toEqual('1.0234e-4')

      expect(getSerializedResult('max')).toEqual('max')
      expect(getSerializedResult('mAx')).toEqual('max')
      expect(getSerializedResult('MAX')).toEqual('max')
      expect(getSerializedResult('MAx')).toEqual('max')
    })

    it('should return the absolute positive value after serializing', () => {
      expect(getSerializedResult('-0.234')).toEqual('0.234')
      expect(getSerializedResult('-0,234')).toEqual('0.234')
      expect(getSerializedResult('-0')).toEqual('0')
      expect(getSerializedResult('-0.123123')).toEqual('0.123123')
      expect(getSerializedResult('-0,123123')).toEqual('0.123123')
      expect(getSerializedResult('-1')).toEqual('1')
      expect(getSerializedResult('-10')).toEqual('10')
    })

    it('should return an empty string after serializing', () => {
      // these should never come into serializing from the input[type=number]
      // but the tests are here in case we change the input type in the future
      expect(getSerializedResult('random')).toEqual('')
      expect(getSerializedResult('null')).toEqual('')
      expect(getSerializedResult('1dfk')).toEqual('')
      expect(getSerializedResult('da24')).toEqual('')

      // these should never come into serializing from the input[type=number]
      // but the tests are here in case we change the input type in the future
      expect(getSerializedResult('1.23.0')).toEqual('')
      expect(getSerializedResult('1,23,0')).toEqual('')
      expect(getSerializedResult('0,null,123')).toEqual('')
      expect(getSerializedResult('some, text')).toEqual('')

      // it's a quirk of the number field that these won't trigger a value change
      // although the function handles these, if these were input,
      // the value of the input will instantly become an empty string, at least it does on Chrome on Mac
      expect(getSerializedResult('12--32123-32')).toEqual('')
      expect(getSerializedResult('--10.23')).toEqual('')
      expect(getSerializedResult('')).toEqual('')
    })

    it('should return formatted value after serializing', () => {
      expect(getSerializedResult('00.001')).toEqual('0.001')
      expect(getSerializedResult('0000')).toEqual('0')
      expect(getSerializedResult('00.000')).toEqual('0.000')
      expect(getSerializedResult('.1')).toEqual('0.1')
      expect(getSerializedResult('00002.123')).toEqual('2.123')
      expect(getSerializedResult('.0234')).toEqual('0.0234')
      expect(getSerializedResult('123.123000')).toEqual('123.123000')

      expect(getSerializedResult('00,001')).toEqual('0.001')
      expect(getSerializedResult('00,000')).toEqual('0.000')
      expect(getSerializedResult(',1')).toEqual('0.1')
      expect(getSerializedResult('00002,123')).toEqual('2.123')
      expect(getSerializedResult(',0234')).toEqual('0.0234')
      expect(getSerializedResult('123,123000')).toEqual('123.123000')
    })
  })

  describe('parse query param to input field value', () => {
    const getParsedResult = (value: string) => AmountQueryParam.parse(value)

    it('should return the original value after parsing', () => {
      expect(getParsedResult('10234')).toEqual('10234')
      expect(getParsedResult('12')).toEqual('12')

      expect(getParsedResult('1.0234')).toEqual('1.0234')
      expect(getParsedResult('0.0234')).toEqual('0.0234')
      expect(getParsedResult('0.0')).toEqual('0.0')
      expect(getParsedResult('0')).toEqual('0')
      expect(getParsedResult('0.000')).toEqual('0.000')

      expect(getParsedResult('1,0234')).toEqual('1.0234')
      expect(getParsedResult('0,0234')).toEqual('0.0234')
      expect(getParsedResult('0,0')).toEqual('0.0')
      expect(getParsedResult('0,000')).toEqual('0.000')

      expect(getParsedResult('1e1')).toEqual('1e1')
      expect(getParsedResult('1.0234e4')).toEqual('1.0234e4')
      expect(getParsedResult('1.0234e-4')).toEqual('1.0234e-4')
      expect(getParsedResult('1,0234e4')).toEqual('1.0234e4')
      expect(getParsedResult('1,0234e-4')).toEqual('1.0234e-4')

      expect(getParsedResult('max')).toEqual('max')
      expect(getParsedResult('mAx')).toEqual('max')
      expect(getParsedResult('MAX')).toEqual('max')
      expect(getParsedResult('MAx')).toEqual('max')
    })

    it('should return the absolute positive value after parsing', () => {
      expect(getParsedResult('-0.234')).toEqual('0.234')
      expect(getParsedResult('-0')).toEqual('0')
      expect(getParsedResult('-0.123123')).toEqual('0.123123')
      expect(getParsedResult('-1')).toEqual('1')
      expect(getParsedResult('-10')).toEqual('10')

      expect(getParsedResult('-0,234')).toEqual('0.234')
      expect(getParsedResult('-0,123123')).toEqual('0.123123')
    })

    it('should return an empty string after parsing', () => {
      expect(getParsedResult('random')).toEqual('')
      expect(getParsedResult('null')).toEqual('')
      expect(getParsedResult('1dfk')).toEqual('')
      expect(getParsedResult('da24')).toEqual('')

      expect(getParsedResult('1,23,0')).toEqual('')
      expect(getParsedResult('1.23.0')).toEqual('')
      expect(getParsedResult('0,null,123')).toEqual('')
      expect(getParsedResult('some, text')).toEqual('')

      expect(getParsedResult('12--32123-32')).toEqual('')
      expect(getParsedResult('--10.23')).toEqual('')
      expect(getParsedResult('')).toEqual('')
    })

    it('should return formatted value after parsing', () => {
      expect(getParsedResult('00.001')).toEqual('0.001')
      expect(getParsedResult('0000')).toEqual('0')
      expect(getParsedResult('00.000')).toEqual('0.000')
      expect(getParsedResult('.1')).toEqual('0.1')
      expect(getParsedResult('00002.123')).toEqual('2.123')
      expect(getParsedResult('.0234')).toEqual('0.0234')
      expect(getParsedResult('123.123000')).toEqual('123.123000')

      expect(getParsedResult('00,001')).toEqual('0.001')
      expect(getParsedResult('00,000')).toEqual('0.000')
      expect(getParsedResult(',1')).toEqual('0.1')
      expect(getParsedResult('00002,123')).toEqual('2.123')
      expect(getParsedResult(',0234')).toEqual('0.0234')
      expect(getParsedResult('123,123000')).toEqual('123.123000')
    })
  })
})

describe('ChainParam custom parser and serializer', () => {
  describe('serialize chainId to chainId/ChainQueryParam', () => {
    it('should return empty string if value is undefined', () => {
      expect(ChainParam.serialize(undefined)).toBe('')
    })

    it('should return ChainQueryParam if value is a valid chainId', () => {
      expect(ChainParam.serialize(ChainId.Ethereum)).toEqual('ethereum')
      expect(ChainParam.serialize(ChainId.ArbitrumOne)).toEqual('arbitrum-one')
      expect(ChainParam.serialize(ChainId.Sepolia)).toEqual('sepolia')
      expect(ChainParam.serialize(ChainId.ArbitrumSepolia)).toEqual(
        'arbitrum-sepolia'
      )
      expect(ChainParam.serialize(1234567890)).toBe('')
      localStorage.setItem(
        customChainLocalStorageKey,
        JSON.stringify([
          { chainID: '1111111111', name: 'custom 1111111111 chain' }
        ])
      )
      expect(ChainParam.serialize(1111111111)).toEqual('1111111111')
      localStorage.clear()
    })
  })

  describe('parse chainId/ChainQueryParam to chainId', () => {
    it('should return undefined if value is null or undefined', () => {
      expect(ChainParam.parse('')).toBeUndefined()
    })

    it('should parse to ChainId if value is a valid ChainQueryParam', () => {
      expect(ChainParam.parse('ethereum')).toEqual(ChainId.Ethereum)
      expect(ChainParam.parse('arbitrum-one')).toEqual(ChainId.ArbitrumOne)
      expect(ChainParam.parse('sepolia')).toEqual(ChainId.Sepolia)
      expect(ChainParam.parse('arbitrum-sepolia')).toEqual(
        ChainId.ArbitrumSepolia
      )
      expect(ChainParam.parse('aaa123')).toBeUndefined()
    })

    it('should parse to ChainId if value is a valid chainId', () => {
      function parseChainId(value: ChainId) {
        return ChainParam.parse(value.toString())
      }
      expect(parseChainId(ChainId.Ethereum)).toEqual(ChainId.Ethereum)
      expect(parseChainId(ChainId.ArbitrumOne)).toEqual(ChainId.ArbitrumOne)
      expect(parseChainId(ChainId.Sepolia)).toEqual(ChainId.Sepolia)
      expect(parseChainId(ChainId.ArbitrumSepolia)).toEqual(
        ChainId.ArbitrumSepolia
      )
      expect(ChainParam.parse('1234567890')).toBeUndefined()
      const customChain = createMockOrbitChain({
        chainId: 222222,
        parentChainId: 1
      })
      registerCustomArbitrumNetwork(customChain)
      expect(ChainParam.parse('222222')).toEqual(222222)
    })
  })
})

describe('TabParam custom parser and serializer', () => {
  describe('serialize tab index number to string query param', () => {
    it('should return string query param if value is a valid tab index number', () => {
      expect(TabParam.serialize(0)).toEqual('bridge')
      expect(TabParam.serialize(1)).toEqual('tx_history')
    })

    it('should return bridge tab string if value is an invalid tab index number', () => {
      expect(TabParam.serialize(2)).toEqual('bridge')
      expect(TabParam.serialize(3)).toEqual('bridge')
      expect(TabParam.serialize(3111111)).toEqual('bridge')
      expect(TabParam.serialize(-1)).toEqual('bridge')
      expect(TabParam.serialize(-129)).toEqual('bridge')
    })

    it('should return bridge tab string if value is an invalid string', () => {
      // @ts-ignore - test invalid values
      expect(TabParam.serialize('xxx')).toEqual('bridge')
      // @ts-ignore - test invalid values
      expect(TabParam.serialize('random text')).toEqual('bridge')
      // @ts-ignore - test invalid values
      // we are encoding the selected tab index number to string; `tx_history` is not a valid tab index number
      expect(TabParam.serialize('tx_history')).toEqual('bridge')
    })
  })

  describe('parse string query param to tab index number', () => {
    it('should return 0 (bridge index number) if value is null or undefined', () => {
      expect(TabParam.parse('')).toEqual(0)
    })

    it('should return bridge tab index number if value is an invalid string query param', () => {
      expect(TabParam.parse('')).toEqual(0)
      expect(TabParam.parse('random')).toEqual(0)
      expect(TabParam.parse('random text here')).toEqual(0)
      expect(TabParam.parse('2')).toEqual(0)
      expect(TabParam.parse('3')).toEqual(0)
      expect(TabParam.parse('3111111')).toEqual(0)
      expect(TabParam.parse('000000')).toEqual(0)
      expect(TabParam.parse('0')).toEqual(0)
      expect(TabParam.parse('1')).toEqual(0)
    })

    it('should return corresponding tab index number if string query param is valid', () => {
      expect(TabParam.parse('bridge')).toEqual(0)
      expect(TabParam.parse('tx_history')).toEqual(1)
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
  describe('serialize', () => {
    it('should return undefined if features is undefined or empty', () => {
      expect(DisabledFeaturesParam.serialize([])).toBe('')
    })

    it('should serialize valid features', () => {
      expect(
        DisabledFeaturesParam.serialize([
          DisabledFeatures.BATCH_TRANSFERS,
          DisabledFeatures.TX_HISTORY
        ])
      ).toEqual('batch-transfers,tx-history')
    })
  })

  describe('parse', () => {
    it('should return empty array if value is null or undefined', () => {
      expect(DisabledFeaturesParam.parse('')).toEqual([])
    })

    it('should return empty array if no valid features are provided', () => {
      expect(DisabledFeaturesParam.parse('invalid-feature')).toEqual([])
      expect(DisabledFeaturesParam.parse('random_feature')).toEqual([])
      expect(DisabledFeaturesParam.parse('')).toEqual([])
    })

    it('should keep only valid features', () => {
      const result = DisabledFeaturesParam.parse(
        [
          DisabledFeatures.BATCH_TRANSFERS,
          'invalid_feature',
          DisabledFeatures.TX_HISTORY
        ].join(',')
      )
      expect(result).toEqual([
        DisabledFeatures.BATCH_TRANSFERS,
        DisabledFeatures.TX_HISTORY
      ])
    })

    it('should handle single valid feature', () => {
      expect(
        DisabledFeaturesParam.parse(DisabledFeatures.BATCH_TRANSFERS)
      ).toEqual([DisabledFeatures.BATCH_TRANSFERS])
    })

    it('should be case insensitive and return canonical case', () => {
      expect(DisabledFeaturesParam.parse('BATCH-TRANSFERS')).toEqual([
        DisabledFeatures.BATCH_TRANSFERS
      ])
    })

    it('should handle mixed case in the same query', () => {
      const result = DisabledFeaturesParam.parse(
        [
          DisabledFeatures.BATCH_TRANSFERS,
          'TX-HISTORY',
          'Batch-Transfers'
        ].join(',')
      )
      expect(result).toEqual([
        DisabledFeatures.BATCH_TRANSFERS,
        DisabledFeatures.TX_HISTORY
      ])
    })

    it('should handle invalid URL values', () => {
      expect(DisabledFeaturesParam.parse('disabledFeatures=')).toEqual([])
      expect(DisabledFeaturesParam.parse('?disabledFeatures=')).toEqual([])
      expect(DisabledFeaturesParam.parse('randomInvalidValue')).toEqual([])
    })
  })
})
