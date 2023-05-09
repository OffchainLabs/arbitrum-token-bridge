import { JsonRpcProvider, Provider } from '@ethersproject/providers'
import { Erc20Bridger } from '@arbitrum/sdk'
import { ethers } from 'ethers'

/**
 * Retrieves the L1 address of an ERC-20 token using its L2 address.
 * @param erc20L2Address
 * @returns
 */
async function getL1ERC20Address({
  erc20L2Address,
  l2Provider
}: {
  erc20L2Address: string
  l2Provider: Provider
}): Promise<string | null> {
  try {
    const erc20Bridger = await Erc20Bridger.fromProvider(l2Provider)
    return await erc20Bridger.getL1ERC20Address(erc20L2Address, l2Provider)
  } catch (error) {
    return null
  }
}

const isValidERC20Token = async ({
  erc20L1orL2Address,
  provider
}: {
  erc20L1orL2Address: string
  provider: JsonRpcProvider
}) => {
  const abi = [
    // erc-20 functions that interest us
    'function balanceOf(address owner) view returns (uint256)',
    'function decimals() view returns (uint8)',
    'function symbol() view returns (string)'
  ]

  try {
    const erc20 = new ethers.Contract(erc20L1orL2Address, abi, provider)
    const decimals = await erc20.decimals()

    // if found valid decimals in the contract, then yes, we can assume it is a valid ERC20 token
    if (decimals) return true
  } catch {
    // contract doesn't support decimals method
  }

  return false
}

export { getL1ERC20Address, isValidERC20Token }
