import { Erc20Bridger, getArbitrumNetwork } from '@arbitrum/sdk'
import { BigNumber, constants } from 'ethers'
import { ERC20__factory } from '@arbitrum/sdk/dist/lib/abi/factories/ERC20__factory'
import {
  ApproveTokenProps,
  BridgeTransferStarter,
  BridgeTransferStarterProps,
  RequiresTokenApprovalProps,
  TransferEstimateGasProps,
  TransferProps,
  TransferType
} from './BridgeTransferStarter'
import {
  fetchErc20Allowance,
  fetchErc20L2GatewayAddress,
  getL1ERC20Address
} from '../util/TokenUtils'
import {
  getAddressFromSigner,
  getChainIdFromProvider,
  percentIncrease
} from './utils'
import { withdrawInitTxEstimateGas } from '../util/WithdrawalUtils'
import { getAccountType } from '../util/AccountUtils'

export class Erc20WithdrawalStarter extends BridgeTransferStarter {
  public transferType: TransferType = 'erc20_withdrawal'

  private sourceChainGatewayAddress: string | undefined

  constructor(props: BridgeTransferStarterProps) {
    super(props)

    if (!this.sourceChainErc20Address) {
      throw Error('Erc20 token address not found')
    }
  }

  private async getSourceChainGatewayAddress(): Promise<string> {
    const destinationChainErc20Address =
      await this.getDestinationChainErc20Address()

    const sourceChainGatewayAddress = await fetchErc20L2GatewayAddress({
      erc20L1Address: destinationChainErc20Address,
      l2Provider: this.sourceChainProvider
    })

    this.sourceChainGatewayAddress = sourceChainGatewayAddress

    return this.sourceChainGatewayAddress
  }

  private async getDestinationChainErc20Address(): Promise<string> {
    if (this.destinationChainErc20Address) {
      return this.destinationChainErc20Address
    }

    if (!this.sourceChainErc20Address) {
      throw Error('Erc20 token address not found')
    }

    const destinationChainErc20Address = await getL1ERC20Address({
      erc20L2Address: this.sourceChainErc20Address,
      l2Provider: this.sourceChainProvider
    })

    if (!destinationChainErc20Address) {
      throw Error('Erc20 token not found on parent chain')
    }

    this.destinationChainErc20Address = destinationChainErc20Address

    return this.destinationChainErc20Address
  }

  public async requiresNativeCurrencyApproval() {
    // native currency approval not required for withdrawal
    return false
  }

  public async approveNativeCurrencyEstimateGas() {
    // no-op
  }

  public async approveNativeCurrency() {
    // no-op
  }

  /**
   * Most tokens inherently allow the token gateway to burn the withdrawal amount
   * on the child chain because they inherit the
   * IArbToken interface that allows the gateway to burn without allowance approval
   *
   * if the token does not have the bridgeBurn method, approval is required
   * https://github.com/OffchainLabs/token-bridge-contracts/blob/d54877598e80a00d264d2b4353968faafd6f534d/contracts/tokenbridge/arbitrum/IArbToken.sol
   *
   */
  public requiresTokenApproval = async ({
    amount,
    owner
  }: RequiresTokenApprovalProps) => {
    if (!this.sourceChainErc20Address) {
      throw Error('Erc20 token address not found')
    }

    const sourceChainId = await getChainIdFromProvider(this.sourceChainProvider)

    const gatewayAddress = await this.getSourceChainGatewayAddress()

    const sourceChainTokenBridge = getArbitrumNetwork(sourceChainId).tokenBridge

    // tokens that use the standard gateways do not require approval on child chain
    const standardGateways = [
      sourceChainTokenBridge?.childErc20Gateway.toLowerCase(),
      sourceChainTokenBridge?.childWethGateway.toLowerCase()
    ]

    if (standardGateways.includes(gatewayAddress.toLowerCase())) {
      return false
    }

    // the below checks are only run for tokens using custom gateway / custom custom gateway
    //
    // check if token withdrawal gas estimation fails
    // if it fails, the token gateway is not allowed to burn the token without additional approval
    const transferEstimateGasResult = await this.transferEstimateGas({
      amount,
      from: owner
    })

    if (!transferEstimateGasResult.isError) {
      return false
    }

    const allowanceForSourceChainGateway = await fetchErc20Allowance({
      address: this.sourceChainErc20Address,
      provider: this.sourceChainProvider,
      owner,
      spender: gatewayAddress
    })

    return allowanceForSourceChainGateway.lt(amount)
  }

  public async approveTokenEstimateGas({ signer, amount }: ApproveTokenProps) {
    if (!this.sourceChainErc20Address) {
      throw Error('Erc20 token address not found')
    }

    const address = await getAddressFromSigner(signer)
    const gatewayAddress = await this.getSourceChainGatewayAddress()

    const contract = ERC20__factory.connect(
      this.sourceChainErc20Address,
      signer
    )

    return contract.estimateGas.approve(
      gatewayAddress,
      amount ?? constants.MaxUint256,
      {
        from: address
      }
    )
  }

  public async approveToken({ signer, amount }: ApproveTokenProps) {
    if (!this.sourceChainErc20Address) {
      throw Error('Erc20 token address not found')
    }

    const gatewayAddress = await this.getSourceChainGatewayAddress()

    const contract = ERC20__factory.connect(
      this.sourceChainErc20Address,
      signer
    )

    // approval transaction
    await contract.functions.approve(
      gatewayAddress,
      amount ?? constants.MaxUint256
    )
  }

  public async transferEstimateGas({ amount, from }: TransferEstimateGasProps) {
    if (!this.sourceChainErc20Address) {
      throw Error('Erc20 token address not found')
    }

    const destinationChainErc20Address =
      await this.getDestinationChainErc20Address()

    return withdrawInitTxEstimateGas({
      amount,
      address: from as `0x${string}`,
      erc20L1Address: destinationChainErc20Address,
      childChainProvider: this.sourceChainProvider
    })
  }

  public async transfer({ amount, signer, destinationAddress }: TransferProps) {
    if (!this.sourceChainErc20Address) {
      throw Error('Erc20 token address not found')
    }

    const destinationChainErc20Address =
      await this.getDestinationChainErc20Address()

    const address = await getAddressFromSigner(signer)

    const sourceChainId = await getChainIdFromProvider(this.sourceChainProvider)

    const isSmartContractWallet =
      (await getAccountType({
        address,
        chainId: sourceChainId
      })) === 'smart-contract-wallet'

    if (isSmartContractWallet && !destinationAddress) {
      throw new Error(`Missing destination address`)
    }

    const erc20Bridger = await Erc20Bridger.fromProvider(
      this.sourceChainProvider
    )

    const request = await erc20Bridger.getWithdrawalRequest({
      from: address,
      erc20ParentAddress: destinationChainErc20Address,
      destinationAddress: destinationAddress ?? address,
      amount
    })

    const tx = await erc20Bridger.withdraw({
      ...request,
      childSigner: signer,
      overrides: {
        gasLimit: percentIncrease(
          await this.sourceChainProvider.estimateGas(request.txRequest),
          BigNumber.from(30)
        )
      }
    })

    return {
      transferType: this.transferType,
      status: 'pending',
      sourceChainProvider: this.sourceChainProvider,
      sourceChainTransaction: tx,
      destinationChainProvider: this.destinationChainProvider
    }
  }
}
