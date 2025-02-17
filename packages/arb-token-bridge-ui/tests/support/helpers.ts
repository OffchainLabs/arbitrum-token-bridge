import { Erc20Bridger, registerCustomArbitrumNetwork } from '@arbitrum/sdk'
import { type Provider } from '@ethersproject/providers'
import {
  defaultL2Network,
  defaultL3CustomGasTokenNetwork,
  defaultL3Network
} from './networksNitroTestnode'

export async function getL2ERC20Address({
  erc20L1Address,
  l1Provider,
  l2Provider
}: {
  erc20L1Address: string
  l1Provider: Provider
  l2Provider: Provider
}): Promise<string> {
  const erc20Bridger = await Erc20Bridger.fromProvider(l2Provider)
  return await erc20Bridger.getChildErc20Address(erc20L1Address, l1Provider)
}

export async function registerLocalNetwork() {
  try {
    registerCustomArbitrumNetwork(defaultL2Network)

    const isLocalCustomNativeToken =
      process.env.ORBIT_CUSTOM_GAS_TOKEN === 'true'

    registerCustomArbitrumNetwork(
      isLocalCustomNativeToken
        ? defaultL3CustomGasTokenNetwork
        : defaultL3Network
    )
  } catch (error: any) {
    console.error(`Failed to register local network: ${error.message}`)
  }
}
