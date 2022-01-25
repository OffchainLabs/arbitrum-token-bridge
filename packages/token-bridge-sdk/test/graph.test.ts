import 'cross-fetch/polyfill'
import {
  getTokenWithdrawals,
  messageHasExecuted,
  getNodes,
  getETHWithdrawals
} from '../src/util/graph'
import { utils, BigNumber } from 'ethers'

const assert = require('assert')

describe('Graph tests', function () {
  describe('#getTokenWithdrawals', function () {
    it('should get token with correctly calculated token addresses', async () => {
      const res = await getTokenWithdrawals(
        '0xA4b1838cb086DDDAFA655F247716b502e87A0672',
        0,
        2930202,
        '1'
      )

      assert(
        res.every(withdrawal =>
          utils.isAddress(withdrawal.otherData.tokenAddress)
        ),
        'Token addresses are all addresses'
      )
    })
  })

  describe('#getEthWithdrawals', function () {
    it('should get get eth withdrawals', async () => {
      const res = await getETHWithdrawals(
        '0xA4b1838cb086DDDAFA655F247716b502e87A0672',
        0,
        2930202,
        '1'
      )
      console.log(`Got ${res.length} eth withdrawals `)
    })
  })

  describe('#messageHasExecuted', function () {
    it('should return false for out of range batch', async () => {
      const res = await messageHasExecuted(
        BigNumber.from(10000000000),
        BigNumber.from(0),
        '1'
      )
      assert(!res, 'returns false gracefully')
    })
  })

  describe('#getNodes', function () {
    it('should get nodes!', async () => {
      const nodes = await getNodes('1', 0)      
      assert(nodes.length > 1600)
    })
  })
})
