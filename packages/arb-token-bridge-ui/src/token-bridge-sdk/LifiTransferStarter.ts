import { prepareSendTransaction, sendTransaction } from '@wagmi/core'
import { BigNumber, constants } from 'ethers'
import { ERC20__factory } from '@arbitrum/sdk/dist/lib/abi/factories/ERC20__factory'

import {
  ApproveTokenProps,
  BridgeTransferStarter,
  BridgeTransferStarterProps,
  RequiresTokenApprovalProps,
  TransferProps,
  TransferType
} from './BridgeTransferStarter'
import { fetchErc20Allowance } from '../util/TokenUtils'
import { Address } from '../util/AddressUtils'
import { TransactionRequest } from '../pages/api/crosschain-transfers/lifi'

type LifiData = {
  spenderAddress: Address
  gas: BigNumber
  fee: BigNumber
  transactionRequest: TransactionRequest
}
export type LifiTransferStarterProps = BridgeTransferStarterProps & {
  lifiData: {
    spenderAddress: string
    gas: BigNumber
    fee: BigNumber
    transactionRequest: TransactionRequest
  }
}

export class LifiTransferStarter extends BridgeTransferStarter {
  public transferType: TransferType = 'lifi'
  private lifiData: LifiData

  constructor(props: LifiTransferStarterProps) {
    super(props)
    this.lifiData = {
      spenderAddress: props.lifiData.spenderAddress as Address,
      gas: props.lifiData.gas,
      fee: props.lifiData.fee,
      transactionRequest: props.lifiData.transactionRequest
    }
  }

  public requiresNativeCurrencyApproval = async () => {
    return false
  }

  public async approveNativeCurrencyEstimateGas() {
    // no-op
  }

  public approveNativeCurrency = async () => {
    // no-op
  }

  public async requiresTokenApproval({
    amount,
    owner
  }: RequiresTokenApprovalProps): Promise<boolean> {
    if (!this.sourceChainErc20Address) {
      // If we have no sourceChainErc20Address, we assume we want to send ETH
      return false
    }

    const allowance = await fetchErc20Allowance({
      address: this.sourceChainErc20Address,
      provider: this.sourceChainProvider,
      owner,
      spender: this.lifiData.spenderAddress
    })

    return allowance.lt(amount)
  }

  public async approveToken({ signer, amount }: ApproveTokenProps) {
    if (!this.sourceChainErc20Address) {
      return
    }

    const contract = ERC20__factory.connect(
      this.sourceChainErc20Address,
      signer
    )

    return contract.approve(
      this.lifiData.spenderAddress,
      amount ?? constants.MaxUint256,
      {
        from: await signer.getAddress()
      }
    )
  }

  public async approveTokenEstimateGas({ signer, amount }: ApproveTokenProps) {
    if (!this.sourceChainErc20Address) {
      return constants.Zero
    }

    const contract = ERC20__factory.connect(
      this.sourceChainErc20Address,
      signer
    )

    return contract.estimateGas.approve(
      this.lifiData.spenderAddress,
      amount ?? constants.MaxUint256,
      {
        from: await signer.getAddress()
      }
    )
  }

  public async transferEstimateGas() {
    // We only use lifi for withdrawal, source chain is the child chain
    return {
      estimatedParentChainGas: constants.Zero,
      estimatedChildChainGas: this.lifiData.gas
    }
  }

  public async transfer({ signer }: TransferProps) {
    const config = await prepareSendTransaction({
      chainId: this.lifiData.transactionRequest.chainId,
      request: this.lifiData.transactionRequest,
      signer: signer
    })
    const tx = await sendTransaction(config)

    return {
      transferType: this.transferType,
      status: 'pending',
      sourceChainProvider: this.sourceChainProvider,
      sourceChainTransaction: tx,
      destinationChainProvider: this.destinationChainProvider
    }
  }

  public async transferEstimateFee() {
    return this.lifiData.fee
  }
}
