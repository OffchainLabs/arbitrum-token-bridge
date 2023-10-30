import { EthBridger } from '@arbitrum/sdk'
import { Provider } from '@ethersproject/providers'
import { BigNumber, constants } from 'ethers'

import { DepositGasEstimates } from '../hooks/arbTokenBridge.types'

export async function depositEthEstimateGas({
  l2Provider
}: {
  l2Provider: Provider
}): Promise<DepositGasEstimates> {
  const ethBridger = await EthBridger.fromProvider(l2Provider)

  const defaults = {
    estimatedL2Gas: constants.Zero,
    estimatedL2SubmissionCost: constants.Zero
  }

  if (typeof ethBridger.nativeToken !== 'undefined') {
    return {
      ...defaults,
      // Values set by looking at a couple of different custom fee token deposits
      //
      // https://testnet.arbiscan.io/tx/0xbcc868a6eef9ce2c828849df0848f660d318e8e07a96d0889f9f5a812b4f5866
      // https://testnet.arbiscan.io/tx/0x864bd34479205831142b99ac59034662cc2dbc6eaae92c883a03068d73c561d4
      // https://testnet.arbiscan.io/tx/0x3f38bbeaa57b04b5f42c0fbcd5a0e6713640b2c177c2be49eb47cb1eadd97c97
      //
      // TODO: check if these values will vary based on the fee token
      estimatedL1Gas: BigNumber.from(200_000)
    }
  }

  return {
    ...defaults,
    // Values set by looking at a couple of different ETH deposits
    //
    // https://etherscan.io/tx/0x54b6924b74376391f1429df6670feb219625f4cbb9a34a9a68d44e34475d7ae0
    // https://etherscan.io/tx/0xb7bc40b64ae13f08690e60a13ec9f3b55bd8e55b40ece75287716b5be1924966
    // https://etherscan.io/tx/0x296a6e3099ab47d37b5e5e2baa425fd83ec1275c667331af5a7141703ded5cda
    // https://etherscan.io/tx/0x6602283cc8700636ab39e40d158c30b895e691c86b66d1b762f62340082664b7
    estimatedL1Gas: BigNumber.from(100_000)
  }
}
