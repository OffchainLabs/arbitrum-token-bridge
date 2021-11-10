import 'cross-fetch/polyfill'
import { getTokenWithdrawals } from '../util/graph'
import { utils } from 'ethers'

const assert = require('assert')

describe('Graph tests', function () {
  describe('#getTokenWithdrawals', function () {
    it('should get token with correctly calulcated token addresses', async () => {
      const res = await getTokenWithdrawals(
        '0xA4b1838cb086DDDAFA655F247716b502e87A0672',
        0,
        2930202,
        '1'
      )
      console.log(`Got ${res.length} withdrawals `)
      assert(
        res.every(withdrawal =>
          utils.isAddress(withdrawal.otherData.tokenAddress)
        ),
        'Token addresses are all addresses'
      )
    })
  })
})
