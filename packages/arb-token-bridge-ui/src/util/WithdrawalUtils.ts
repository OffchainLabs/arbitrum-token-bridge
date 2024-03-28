import { Erc20Bridger, EthBridger } from '@arbitrum/sdk'
import { Provider } from '@ethersproject/providers'
import { BigNumber } from 'ethers'
import * as Sentry from '@sentry/react'
import { L2ToL1TransactionRequest } from '@arbitrum/sdk/dist/lib/dataEntities/transactionRequest'

import { GasEstimates } from '../hooks/arbTokenBridge.types'
import { Address } from './AddressUtils'

export async function withdrawInitTxEstimateGas({
  amount,
  address,
  childChainProvider,
  erc20L1Address
}: {
  amount: BigNumber
  address: Address
  childChainProvider: Provider
  erc20L1Address?: string
}): Promise<GasEstimates> {
  const isToken = typeof erc20L1Address === 'string'

  // For the withdrawal init tx, there's no gas fee paid on L1 separately
  // unless we break down part of the L2 gas fee into L2 tx fee + L1 batch posting fee for that tx
  // but as that does not fit into the context of the transfer. and
  // would lead to user confusion, we instead present all the gas fee as L2 gas fee
  const estimatedParentChainGas = BigNumber.from(0)

  try {
    let withdrawalRequest: L2ToL1TransactionRequest

    if (isToken) {
      const bridger = await Erc20Bridger.fromProvider(childChainProvider)
      withdrawalRequest = await bridger.getWithdrawalRequest({
        amount,
        destinationAddress: address,
        from: address,
        erc20l1Address: erc20L1Address
      })
    } else {
      const bridger = await EthBridger.fromProvider(childChainProvider)
      withdrawalRequest = await bridger.getWithdrawalRequest({
        amount,
        destinationAddress: address,
        from: address
      })
    }

    // add 30% to the estimated total gas as buffer
    const estimatedChildChainGas = BigNumber.from(
      Math.ceil(
        Number(
          await childChainProvider.estimateGas(withdrawalRequest.txRequest)
        ) * 1.3
      )
    )

    return {
      estimatedParentChainGas,
      estimatedChildChainGas
    }
  } catch (error) {
    Sentry.captureException(error)

    return {
      estimatedParentChainGas,
      // L2 gas estimation from recent txs
      //
      // ETH withdrawals @ ArbSys, average 482,462:
      // 277,881
      // https://arbiscan.io/tx/0x1cad1367c0accc27b448a826788c05279a1bdbab15665964f309638c11fbde62
      // 362,935
      // https://arbiscan.io/tx/0x9638b007b20750d2cf6d2fd5478e3684c445574d54585f236ec144a739a2a9e5
      // 784,954
      // https://arbiscan.io/tx/0xb5960bc91bb0557f4e6703d16bca7bba36c7c78f89be33278f4e98ca4c07cd18
      // 504,076
      // https://arbiscan.io/tx/0x8af2ff06697a575c63a99048f7370c2d6df87ee014d08235f3704841cd0dd78d
      //
      // ERC20 withdrawal @ L2 Gateway Router, average: 792,636:
      // 820,150
      // https://arbiscan.io/tx/0x0d94c5796d587c77fd0a81f4c151e17fe223a72c8665f57051d683f4a8d5b163
      // USDC.e withdrawal 656,110
      // https://arbiscan.io/tx/0xb881acb8a2e67214bc8415c1a8a6e28b07562298fa1487e60d08e7ff2e770e58
      // cbETH withdrawal 901,650
      // https://arbiscan.io/tx/0xadce86693186171735d6396b6c916cd029341bfe41240355f8f58b6721577128
      // WETH withdrawal 892,486
      // https://arbiscan.io/tx/0x81427c5815f058905b4ed876ea6d3496392b15292daf510db08c94c16eff2703
      // WETH withdrawal 1,381,140
      // https://arbiscan.io/tx/0xb9c866257b6f8861c2323ae902f681f7ffa313c3a3b93347f1ecaa0aa5c9b59e
      estimatedChildChainGas: isToken
        ? BigNumber.from(1_400_000)
        : BigNumber.from(800_000)
    }
  }
}
