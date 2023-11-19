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

export class BridgeTransferStarterFactoryV2 {
  public static async init(
    props: BridgeTransferStarterV2Props
  ): Promise<BridgeTransferStarterV2 | undefined> {
    const {
      amount,
      isSmartContractWallet,
      destinationAddress,
      sourceChainProvider,
      destinationChainProvider,
      sourceChainSigner,
      destinationChainSigner,
      nativeCurrency,
      selectedToken
    } = props

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

    const tokenAddress = isDeposit
      ? selectedToken?.sourceChainErc20ContractAddress
      : selectedToken?.destinationChainErc20ContractAddress

    const isUsdcTransfer =
      tokenAddress &&
      (isTokenMainnetUSDC(tokenAddress) ||
        isTokenArbitrumOneNativeUSDC(tokenAddress) ||
        isTokenArbitrumGoerliNativeUSDC(tokenAddress) ||
        isTokenGoerliUSDC(tokenAddress))

    if (isDeposit && isUsdcTransfer) {
      // return Cctp deposit
      console.log('bridge-sdk mode: CCTP Deposit')
      return
    }

    if (!isDeposit && isUsdcTransfer) {
      // return Cctp withdrawal
      console.log('bridge-sdk mode: CCTP Withdrawal')
      return
    }

    if (isDeposit && isNativeCurrencyTransfer) {
      // return Eth deposit
      console.log('bridge-sdk mode: Eth Deposit')
      return new EthDepositStarterV2(props)
    }

    if (!isDeposit && isNativeCurrencyTransfer) {
      // return Eth withdrawal
      console.log('bridge-sdk mode: Eth Withdrawal')
      return
    }

    if (isDeposit && !isNativeCurrencyTransfer) {
      // return Erc20 deposit
      console.log('bridge-sdk mode: Erc20 Deposit')
      return new Erc20DepositStarterV2(props)
    }

    if (!isDeposit && !isNativeCurrencyTransfer) {
      // return Erc20 withdrawal
      console.log('bridge-sdk mode: Erc20 Withdrawal')
      return
    }

    throw Error('bridge-sdk mode: unhandled mode detected')

    // else throw an error - chain pair not valid

    // if (isNetwork(sourceChainId).isEthereumMainnetOrTestnet) {
    //   // todo: add case for ETH deposit as well
    //   return new Erc20DepositStarter(props)
    // } else {
    //   // todo: add case for ERC20 deposit as well
    //   return new Erc20WithdrawalStarter(props)
    // }
  }
}
