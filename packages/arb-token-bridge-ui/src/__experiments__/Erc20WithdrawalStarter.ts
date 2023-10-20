import { Erc20Bridger } from '@arbitrum/sdk'

import {
  BridgeTransferStarter,
  BridgeTransferStarterApproveFunctionProps,
  BridgeTransferStarterStartFunctionProps
} from './BridgeTransferStarter'
import { ContractTransaction } from 'ethers'
import { BridgeTransfer } from './BridgeTransfer'
import { MaxUint256 } from '@ethersproject/constants'
import { getL2ERC20Address, getL2GatewayAddress } from '../util/TokenUtils'
import { Erc20Withdrawal } from './Erc20Withdrawal'
import { ERC20__factory } from '@arbitrum/sdk/dist/lib/abi/factories/ERC20__factory'

export class Erc20WithdrawalStarter extends BridgeTransferStarter {
  public async requiresApproval(
    props: BridgeTransferStarterStartFunctionProps
  ): Promise<boolean> {
    const account = await props.sourceChainSigner.getAddress()

    if (typeof this.destinationChainErc20ContractAddress === 'undefined') {
      throw new Error('unexpected')
    }

    const sourceChainErc20ContractAddress = await getL2ERC20Address({
      l1Provider: this.destinationChainProvider,
      l2Provider: this.sourceChainProvider,
      erc20L1Address: this.destinationChainErc20ContractAddress
    })

    if (!account || !this.sourceChainErc20ContractAddress) {
      throw new Error('unexpected')
    }

    this.setSourceChainErc20ContractAddress(sourceChainErc20ContractAddress)

    const token = ERC20__factory.connect(
      this.sourceChainErc20ContractAddress,
      this.sourceChainProvider
    )

    const gatewayAddress = await getL2GatewayAddress({
      erc20L1Address: this.destinationChainErc20ContractAddress,
      l2Provider: this.sourceChainProvider
    })

    return (await token.allowance(account, gatewayAddress)).lte(props.amount)
  }

  public async approve(
    props: BridgeTransferStarterApproveFunctionProps
  ): Promise<ContractTransaction> {
    if (
      !this.sourceChainErc20ContractAddress ||
      !this.destinationChainErc20ContractAddress
    ) {
      throw new Error('address not found')
    }

    if (!props.sourceChainSigner) {
      throw new Error('exception')
    }

    const gatewayAddress = await getL2GatewayAddress({
      erc20L1Address: this.destinationChainErc20ContractAddress,
      l2Provider: this.sourceChainProvider
    })
    const contract = ERC20__factory.connect(
      this.sourceChainErc20ContractAddress,
      props.sourceChainSigner
    )
    const tx = await contract.functions.approve(
      gatewayAddress,
      props.amount ?? MaxUint256
    )
    return tx
  }

  public async start(
    props: BridgeTransferStarterStartFunctionProps
  ): Promise<BridgeTransfer> {
    debugger
    const account = await props.sourceChainSigner.getAddress()

    debugger
    const erc20Bridger = await Erc20Bridger.fromProvider(
      this.sourceChainProvider
    )

    if (
      typeof account === 'undefined' ||
      typeof this.destinationChainErc20ContractAddress === 'undefined'
    ) {
      throw new Error('unexpected')
    }

    console.log('XXX withdraw', {
      l2Signer: props.sourceChainSigner,
      erc20l1Address: this.destinationChainErc20ContractAddress,
      destinationAddress: account,
      amount: props.amount.toString()
    })

    const withdrawalRequest = await erc20Bridger.getWithdrawalRequest({
      amount: props.amount,
      destinationAddress: account,
      erc20l1Address: this.destinationChainErc20ContractAddress,
      from: account
    })

    const tx = await erc20Bridger.withdraw({
      ...withdrawalRequest,
      l2Signer: props.sourceChainSigner
    })

    alert('Success')

    return Erc20Withdrawal.fromSourceChainTx({
      sourceChainTx: tx,
      sourceChainProvider: this.sourceChainProvider,
      destinationChainProvider: this.destinationChainProvider
    })
  }
}
