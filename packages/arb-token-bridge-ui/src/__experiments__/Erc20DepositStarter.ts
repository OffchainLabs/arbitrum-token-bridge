import { Erc20Bridger } from '@arbitrum/sdk'

import {
  BridgeTransferStarter,
  BridgeTransferStarterApproveFunctionProps,
  BridgeTransferStarterStartFunctionProps
} from './BridgeTransferStarter'
import { Erc20Deposit } from './Erc20Deposit'
import { ContractTransaction } from 'ethers'
import { BridgeTransfer } from './BridgeTransfer'
import { getL1TokenAllowance } from '../util/TokenUtils'

export class Erc20DepositStarter extends BridgeTransferStarter {
  public async requiresApproval(
    props: BridgeTransferStarterStartFunctionProps
  ): Promise<boolean> {
    const account = await props.sourceChainSigner.getAddress()

    if (typeof this.sourceChainErc20ContractAddress === 'undefined') {
      throw new Error('unexpected')
    }

    const allowance = await getL1TokenAllowance({
      account,
      erc20L1Address: this.sourceChainErc20ContractAddress,
      l1Provider: this.sourceChainProvider,
      l2Provider: this.destinationChainProvider
    })

    return allowance.lt(props.amount)
  }

  public async approve(
    props: BridgeTransferStarterApproveFunctionProps
  ): Promise<ContractTransaction> {
    const erc20Bridger = await Erc20Bridger.fromProvider(
      this.destinationChainProvider
    )

    if (typeof this.sourceChainErc20ContractAddress === 'undefined') {
      throw new Error('unexpected')
    }

    return erc20Bridger.approveToken({
      amount: props.amount,
      l1Signer: props.sourceChainSigner,
      erc20L1Address: this.sourceChainErc20ContractAddress
    })
  }

  public async start(
    props: BridgeTransferStarterStartFunctionProps
  ): Promise<BridgeTransfer> {
    const erc20Bridger = await Erc20Bridger.fromProvider(
      this.destinationChainProvider
    )

    if (typeof this.sourceChainErc20ContractAddress === 'undefined') {
      throw new Error('unexpected')
    }

    const tx = await erc20Bridger.deposit({
      amount: props.amount,
      l1Signer: props.sourceChainSigner,
      erc20L1Address: this.sourceChainErc20ContractAddress,
      l2Provider: this.destinationChainProvider
    })

    return Erc20Deposit.fromSourceChainTx({
      sourceChainTx: tx,
      sourceChainProvider: this.sourceChainProvider,
      destinationChainProvider: this.destinationChainProvider
    })
  }
}
