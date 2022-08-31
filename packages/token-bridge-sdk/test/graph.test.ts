import 'cross-fetch/polyfill'
import { getTokenWithdrawals, getETHWithdrawals } from '../src/util/graph'
import { utils } from 'ethers'

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
})
