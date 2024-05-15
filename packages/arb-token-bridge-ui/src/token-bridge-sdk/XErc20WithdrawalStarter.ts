import { Erc20Bridger } from '@arbitrum/sdk'
import { BigNumber, constants } from 'ethers'
import { ERC20__factory } from '@arbitrum/sdk/dist/lib/abi/factories/ERC20__factory'
import {
  ApproveTokenProps,
  BridgeTransferStarterProps,
  TransferEstimateGas,
  TransferProps
} from './BridgeTransferStarter'
import { fetchErc20L2GatewayAddress } from '../util/TokenUtils'
import { getAddressFromSigner, percentIncrease } from './utils'
import { withdrawInitTxEstimateGas } from '../util/WithdrawalUtils'
import { addressIsSmartContract } from '../util/AddressUtils'
import { Erc20WithdrawalStarter } from './Erc20WithdrawalStarter'

export class XErc20WithdrawalStarter extends Erc20WithdrawalStarter {
  protected sourceChainAdapterAddress: string

  constructor(props: BridgeTransferStarterProps) {
    super(props)

    if (!this.adapter) {
      // TODO check for ... and change name
      throw Error('Address for XERC20 adapter was expected')
    }

    // TODO change to 0xa399D70735BD37d786D9E49d03DEA44Cde603Dcd as source adapter.
    this.sourceChainAdapterAddress =
      '0xa399D70735BD37d786D9E49d03DEA44Cde603Dcd' // TODO this.adapter
  }

  protected async getSourceChainGatewayAddress(): Promise<string> {
    const sourceChainGatewayAddress = await fetchErc20L2GatewayAddress({
      erc20L1Address: this.sourceChainAdapterAddress,
      l2Provider: this.sourceChainProvider
    })

    this.sourceChainGatewayAddress = sourceChainGatewayAddress

    return this.sourceChainGatewayAddress
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
