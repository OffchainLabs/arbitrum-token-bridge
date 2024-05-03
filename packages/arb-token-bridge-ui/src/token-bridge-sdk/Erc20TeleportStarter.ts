import { Erc20L1L3Bridger, getL2Network } from '@arbitrum/sdk'
import { ERC20__factory } from '@arbitrum/sdk/dist/lib/abi/factories/ERC20__factory'
import { BigNumber, constants } from 'ethers'
import {
  ApproveTokenProps,
  BridgeTransferStarter,
  BridgeTransferStarterProps,
  RequiresTokenApprovalProps,
  TransferEstimateGas,
  TransferProps,
  TransferType
} from './BridgeTransferStarter'
import { fetchErc20Allowance } from '../util/TokenUtils'
import { getAddressFromSigner, percentIncrease } from './utils'
import { getL2ConfigForTeleport } from './teleport'

export class Erc20TeleportStarter extends BridgeTransferStarter {
  public transferType: TransferType = 'erc20_teleport'

  private l1l3Bridger: Erc20L1L3Bridger | undefined

  constructor(props: BridgeTransferStarterProps) {
    super(props)

    if (!this.sourceChainErc20Address) {
      throw Error('Erc20 token address not found')
    }
  }

  private async getBridger() {
    if (this.l1l3Bridger) {
      return this.l1l3Bridger
    }

    const l3Network = await getL2Network(this.destinationChainProvider)
    this.l1l3Bridger = new Erc20L1L3Bridger(l3Network)

    return this.l1l3Bridger
  }

  public async requiresNativeCurrencyApproval() {
    return false
  }

  public async approveNativeCurrency() {
    // no-op
  }

  public async approveNativeCurrencyEstimateGas() {
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

    const l1l3Bridger = await this.getBridger()

    const l1TeleporterAddress = l1l3Bridger.teleporterAddresses.l1Teleporter

    const allowanceForTeleporter = await fetchErc20Allowance({
      address: this.sourceChainErc20Address,
      provider: this.sourceChainProvider,
      owner: address,
      spender: l1TeleporterAddress
    })

    return allowanceForTeleporter.lt(amount)
  }

  public async approveTokenEstimateGas({ signer, amount }: ApproveTokenProps) {
    if (!this.sourceChainErc20Address) {
      throw Error('Erc20 token address not found')
    }
    const address = await getAddressFromSigner(signer)

    const l1l3Bridger = await this.getBridger()
    const l1TeleporterAddress = l1l3Bridger.teleporterAddresses.l1Teleporter

    const contract = ERC20__factory.connect(
      this.sourceChainErc20Address,
      this.sourceChainProvider
    )
    return contract.estimateGas.approve(
      l1TeleporterAddress,
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

    const l1l3Bridger = await this.getBridger()

    return l1l3Bridger.approveToken({
      erc20L1Address: this.sourceChainErc20Address,
      l1Signer: signer,
      amount
    })
  }

  public async transferEstimateGas({ amount, signer }: TransferEstimateGas) {
    if (!this.sourceChainErc20Address) {
      throw Error('Erc20 token address not found')
    }

    // get the intermediate L2 chain provider
    const { l2Provider } = await getL2ConfigForTeleport({
      destinationChainProvider: this.destinationChainProvider
    })

    const l1l3Bridger = await this.getBridger()

    const depositRequest = await l1l3Bridger.getDepositRequest({
      l1Signer: signer,
      erc20L1Address: this.sourceChainErc20Address,
      amount,
      l1Provider: this.sourceChainProvider,
      l2Provider,
      l3Provider: this.destinationChainProvider
    })

    try {
      const estimatedParentChainGas =
        await this.sourceChainProvider.estimateGas(depositRequest.txRequest)
      return {
        estimatedParentChainGas: percentIncrease(
          estimatedParentChainGas,
          BigNumber.from(5)
        ),
        estimatedChildChainGas: constants.Zero
      }
    } catch (e) {
      console.warn(
        'Error while estimating gas, falling back to hardcoded values.',
        e
      )
      return {
        // fallback estimates
        // https://sepolia.etherscan.io/tx/0x894321f07217d4add560e3c011fbcea672c79eb8b5e7d5332a1657e1d21ca8c4
        estimatedParentChainGas: BigNumber.from(380_000),
        estimatedChildChainGas: constants.Zero
      }
    }
  }

  public async transfer({ amount, signer, destinationAddress }: TransferProps) {
    if (!this.sourceChainErc20Address) {
      throw Error('Erc20 token address not found')
    }

    const address = await getAddressFromSigner(signer)

    // // get the intermediate L2 chain provider
    const { l2Provider } = await getL2ConfigForTeleport({
      destinationChainProvider: this.destinationChainProvider
    })

    const l1l3Bridger = await this.getBridger()

    const depositRequest = await l1l3Bridger.getDepositRequest({
      l1Signer: signer,
      to: destinationAddress ?? address,
      erc20L1Address: this.sourceChainErc20Address,
      amount,
      l1Provider: this.sourceChainProvider,
      l2Provider,
      l3Provider: this.destinationChainProvider
    })

    const tx = await l1l3Bridger.deposit({
      txRequest: depositRequest.txRequest,
      l1Signer: signer
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
