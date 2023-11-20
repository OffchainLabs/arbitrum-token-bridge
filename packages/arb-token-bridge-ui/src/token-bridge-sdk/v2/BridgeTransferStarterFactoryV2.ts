import {
  BridgeTransferStarterV2,
  BridgeTransferStarterV2Props
} from './BridgeTransferStarterV2'
import {
  isTokenArbitrumGoerliNativeUSDC,
  isTokenArbitrumOneNativeUSDC,
  isTokenGoerliUSDC,
  isTokenMainnetUSDC
} from '../../util/TokenUtils'
import { isNetwork } from '../../util/networks'
import { EthDepositStarterV2 } from './EthDepositV2'
import { Erc20DepositStarterV2 } from './Erc20DepositV2'
import { TokenType } from '../../hooks/arbTokenBridge.types'
import { CctpDepositStarterV2 } from './CctpDepositV2'
import { CctpWithdrawalStarterV2 } from './CctpWithdrawalV2'
import { EthWithdrawalStarterV2 } from './EthWithdrawalV2'
import { Erc20WithdrawalStarterV2 } from './Erc20WithdrawalV2'

export class BridgeTransferStarterFactoryV2 {
  public static async init(
    props: BridgeTransferStarterV2Props
  ): Promise<BridgeTransferStarterV2 | undefined> {
    const { sourceChainProvider, destinationChainProvider, selectedToken } =
      props

    const sourceChainNetwork = await sourceChainProvider.getNetwork()
    const destinationChainNetwork = await destinationChainProvider.getNetwork()

    const sourceChainId = sourceChainNetwork.chainId
    const destinationChainId = destinationChainNetwork.chainId

    const isBaseChainEthereum =
      isNetwork(sourceChainId).isEthereumMainnetOrTestnet
    const isBaseChainArbitrum = isNetwork(sourceChainId).isArbitrum
    const isDestinationChainOrbit = isNetwork(destinationChainId).isOrbitChain

    const isDeposit =
      isBaseChainEthereum || (isBaseChainArbitrum && isDestinationChainOrbit)

    const isNativeCurrencyTransfer =
      !selectedToken || selectedToken?.type !== TokenType.ERC20

    const tokenAddress = selectedToken?.sourceChainErc20ContractAddress

    const isUsdcTransfer =
      tokenAddress &&
      (isTokenMainnetUSDC(tokenAddress) ||
        isTokenArbitrumOneNativeUSDC(tokenAddress) ||
        isTokenArbitrumGoerliNativeUSDC(tokenAddress) ||
        isTokenGoerliUSDC(tokenAddress))

    if (isDeposit && isUsdcTransfer) {
      // return Cctp deposit
      console.log('bridge-sdk mode: CCTP Deposit')
      return new CctpDepositStarterV2(props)
    }

    if (!isDeposit && isUsdcTransfer) {
      // return Cctp withdrawal
      console.log('bridge-sdk mode: CCTP Withdrawal')
      return new CctpWithdrawalStarterV2(props)
    }

    if (isDeposit && isNativeCurrencyTransfer) {
      // return Eth deposit
      console.log('bridge-sdk mode: Eth Deposit')
      return new EthDepositStarterV2(props)
    }

    if (!isDeposit && isNativeCurrencyTransfer) {
      // return Eth withdrawal
      console.log('bridge-sdk mode: Eth Withdrawal')
      return new EthWithdrawalStarterV2(props)
    }

    if (isDeposit && !isNativeCurrencyTransfer) {
      // return Erc20 deposit
      console.log('bridge-sdk mode: Erc20 Deposit')
      return new Erc20DepositStarterV2(props)
    }

    if (!isDeposit && !isNativeCurrencyTransfer) {
      // return Erc20 withdrawal
      console.log('bridge-sdk mode: Erc20 Withdrawal')
      return new Erc20WithdrawalStarterV2(props)
    }

    // else throw an error - chain pair not valid eg. L1-to-L3 transfer
    throw Error('bridge-sdk mode: unhandled mode detected')
  }
}
