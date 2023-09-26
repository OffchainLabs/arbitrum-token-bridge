import { getL1Network } from '@arbitrum/sdk'
import { Provider } from '@ethersproject/providers'
import { BridgeTransferStarter } from './BridgeTransferStarter'
import { EthDepositStarter } from './EthDepositStarter'
import { EthWithdrawalStarter } from './EthWithdrawalStarter'

export class BridgeTransferStarterFactory {
  public static async create(props: {
    fromChainProvider: Provider
    fromChainErc20ContractAddress?: string
    toChainProvider: Provider
  }): Promise<BridgeTransferStarter> {
    try {
      await getL1Network(props.fromChainProvider)

      return new EthDepositStarter(props)
    } catch (error) {
      return new EthWithdrawalStarter(props)
    }
  }
}
