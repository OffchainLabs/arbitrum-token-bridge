import { EthBridger } from '@arbitrum/sdk'
import { Provider } from '@ethersproject/providers'
import { BigNumber, constants } from 'ethers'

import { DepositGasEstimates } from '../hooks/arbTokenBridge.types'

export async function depositEthEstimateGas({
  l2Provider
}: {
  l2Provider: Provider
}): Promise<DepositGasEstimates> {
  // this will be needed in custom fee token
  const ethBridger = await EthBridger.fromProvider(l2Provider)

  // todo: this can't be hardcoded for eth deposits to custom destination address
  const defaults = {
    estimatedL2Gas: constants.Zero,
    estimatedL2SubmissionCost: constants.Zero
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
