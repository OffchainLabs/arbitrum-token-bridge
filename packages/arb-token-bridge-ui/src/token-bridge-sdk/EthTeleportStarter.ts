import { EthL1L3Bridger, getArbitrumNetwork } from '@arbitrum/sdk'
import { BigNumber, constants } from 'ethers'
import { StaticJsonRpcProvider } from '@ethersproject/providers'
import {
  BridgeTransferStarter,
  BridgeTransferStarterProps,
  TransferEstimateGas,
  TransferProps,
  TransferType
} from './BridgeTransferStarter'
import { getL2ConfigForTeleport } from './teleport'
import { getAddressFromSigner, percentIncrease } from './utils'

export class EthTeleportStarter extends BridgeTransferStarter {
  public transferType: TransferType = 'eth_teleport'
  private l1l3Bridger: EthL1L3Bridger | undefined
  private l2Provider: StaticJsonRpcProvider | undefined

  constructor(props: BridgeTransferStarterProps) {
    super(props)
  }

  private async getBridger() {
    if (this.l1l3Bridger) {
      return this.l1l3Bridger
    }

    const l3Network = await getArbitrumNetwork(this.destinationChainProvider)
    this.l1l3Bridger = new EthL1L3Bridger(l3Network)

    return this.l1l3Bridger
  }

  private async getL2Provider() {
    if (this.l2Provider) {
      return this.l2Provider
    }

    // get the intermediate L2 chain provider
    const { l2Provider } = await getL2ConfigForTeleport({
      destinationChainProvider: this.destinationChainProvider
    })

    this.l2Provider = l2Provider

    return this.l2Provider
  }

  public async requiresNativeCurrencyApproval() {
    return false //false for now, but will need to be implemented for custom-native-token teleports later
  }

  public async approveNativeCurrency() {
    // no-op, but will need to be implemented for custom-native-token teleports later
  }

  public async approveNativeCurrencyEstimateGas() {
    // no-op, but will need to be implemented for custom-native-token teleports later
  }

  public requiresTokenApproval = async () => false

  public approveTokenEstimateGas = async () => {
    // no-op
  }

  public approveToken = async () => {
    // no-op
  }

  public async transferEstimateGas({
    amount,
    senderAddress
  }: TransferEstimateGas) {
    const l2Provider = await this.getL2Provider()

    const l1l3Bridger = await this.getBridger()

    try {
      const depositRequest = await l1l3Bridger.getDepositRequest({
        from: senderAddress,
        amount,
        l1Provider: this.sourceChainProvider,
        l2Provider,
        l3Provider: this.destinationChainProvider
      })

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
        estimatedParentChainGas: BigNumber.from(240_000),
        estimatedChildChainGas: constants.Zero
      }
    }
  }

  public async transfer({ amount, signer }: TransferProps) {
    const address = await getAddressFromSigner(signer)

    const l2Provider = await this.getL2Provider()

    const l1l3Bridger = await this.getBridger()

    const depositRequest = await l1l3Bridger.getDepositRequest({
      l1Signer: signer,
      destinationAddress: address,
      amount,
      l1Provider: this.sourceChainProvider,
      l2Provider,
      l3Provider: this.destinationChainProvider
    })

    const tx = await l1l3Bridger.deposit({
      ...depositRequest,
      l1Signer: signer
    })

    return {
      transferType: this.transferType,
      status: 'pending',
      sourceChainProvider: this.sourceChainProvider,
      sourceChainTransaction: { ...tx },
      destinationChainProvider: this.destinationChainProvider
    }
  }
}
