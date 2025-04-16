import { it, expect } from 'vitest'
import { BigNumber } from 'ethers'
import { StaticJsonRpcProvider } from '@ethersproject/providers'

import { CctpTransferStarter } from './CctpTransferStarter'
import { CommonAddress } from '../util/CommonAddressUtils'

const starter = new CctpTransferStarter({
  sourceChainProvider: new StaticJsonRpcProvider(
    'https://sepolia.gateway.tenderly.co'
  ),
  destinationChainProvider: new StaticJsonRpcProvider(
    'https://sepolia-rollup.arbitrum.io/rpc'
  )
})

it('returns the correct data for approve token tx request (default amount)', async () => {
  const txRequest = await starter.approveTokenPrepareTxRequest()

  expect(txRequest).toEqual({
    to: CommonAddress.Sepolia.USDC,
    data: '0x095ea7b30000000000000000000000009f3b8679c73c2fef8b59b4f3444d4e156fb70aa5ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
    value: BigNumber.from(0)
  })
})

it('returns the correct data for approve token tx request (custom amount)', async () => {
  const txRequest = await starter.approveTokenPrepareTxRequest({
    amount: BigNumber.from(1_000_000) // 1 usdc (usdc is 6 decimals)
  })

  expect(txRequest).toEqual({
    to: CommonAddress.Sepolia.USDC,
    data: '0x095ea7b30000000000000000000000009f3b8679c73c2fef8b59b4f3444d4e156fb70aa500000000000000000000000000000000000000000000000000000000000f4240',
    value: BigNumber.from(0)
  })
})
