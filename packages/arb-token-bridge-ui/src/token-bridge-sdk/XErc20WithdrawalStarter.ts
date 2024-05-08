import { Erc20Bridger } from '@arbitrum/sdk'
import { BigNumber, constants } from 'ethers'
import { ERC20__factory } from '@arbitrum/sdk/dist/lib/abi/factories/ERC20__factory'
import {
  ApproveTokenProps,
  BridgeTransferStarter,
  BridgeTransferStarterProps,
  RequiresTokenApprovalProps,
  TransferEstimateGas,
  TransferProps,
  TransferType
} from './BridgeTransferStarter'
import {
  fetchErc20L2GatewayAddress,
  getL1ERC20Address
} from '../util/TokenUtils'
import {
  getAddressFromSigner,
  getChainIdFromProvider,
  percentIncrease
} from './utils'
import { tokenRequiresApprovalOnL2 } from '../util/L2ApprovalUtils'
import { withdrawInitTxEstimateGas } from '../util/WithdrawalUtils'
import { addressIsSmartContract } from '../util/AddressUtils'

export class XErc20WithdrawalStarter extends BridgeTransferStarter {
  public transferType: TransferType = 'erc20_withdrawal'

  private sourceChainGatewayAddress: string | undefined
  private sourceChainAdapterAddress: string

  constructor(props: BridgeTransferStarterProps) {
    super(props)

    // TODO - this should come in the props
    this.sourceChainAdapterAddress =
      '0xa399D70735BD37d786D9E49d03DEA44Cde603Dcd'

    if (!this.sourceChainErc20Address) {
      throw Error('Erc20 token address not found')
    }
  }

  private async getSourceChainGatewayAddress(): Promise<string> {
    const destinationChainErc20Address =
      await this.getDestinationChainErc20Address()

    const sourceChainGatewayAddress = await fetchErc20L2GatewayAddress({
      erc20L1Address: this.sourceChainAdapterAddress,
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
      erc20L2Address: this.sourceChainAdapterAddress,
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

  public requiresTokenApproval = async ({
    amount,
    signer
  }: RequiresTokenApprovalProps) => {
    if (!this.sourceChainErc20Address) {
      throw Error('Erc20 token address not found')
    }

    const address = await getAddressFromSigner(signer)

    const token = ERC20__factory.connect(
      this.sourceChainErc20Address,
      this.sourceChainProvider
    )

    const gatewayAddress = await this.getSourceChainGatewayAddress()
    const allowance = await token.allowance(address, gatewayAddress)

    return allowance.lt(amount)
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

  public async transferEstimateGas({ amount, signer }: TransferEstimateGas) {
    if (!this.sourceChainErc20Address) {
      throw Error('Erc20 token address not found')
    }

    const address = (await getAddressFromSigner(signer)) as `0x${string}`

    return withdrawInitTxEstimateGas({
      amount,
      address,
      erc20L1Address: this.sourceChainAdapterAddress,
      childChainProvider: this.sourceChainProvider
    })
  }

  public async transfer({ amount, signer, destinationAddress }: TransferProps) {
    if (!this.sourceChainErc20Address) {
      throw Error('Erc20 token address not found')
    }

    const address = await getAddressFromSigner(signer)

    const isSmartContractWallet = await addressIsSmartContract(
      address,
      this.sourceChainProvider
    )

    if (isSmartContractWallet && !destinationAddress) {
      throw new Error(`Missing destination address`)
    }

    const erc20Bridger = await Erc20Bridger.fromProvider(
      this.sourceChainProvider
    )

    const request = await erc20Bridger.getWithdrawalRequest({
      from: address,
      erc20l1Address: this.sourceChainAdapterAddress,
      destinationAddress: destinationAddress ?? address,
      amount
    })

    const tx = await erc20Bridger.withdraw({
      ...request,
      l2Signer: signer,
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
