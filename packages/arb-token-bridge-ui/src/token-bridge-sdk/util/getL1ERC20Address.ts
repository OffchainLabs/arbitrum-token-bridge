import { JsonRpcProvider, Provider } from '@ethersproject/providers'
import { Erc20Bridger } from '@arbitrum/sdk'
import { BigNumber, ethers } from 'ethers'

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

const getERC20TokenDetails = async ({
  walletAddress,
  erc20L1orL2Address,
  provider
}: {
  walletAddress: string
  erc20L1orL2Address: string
  provider: JsonRpcProvider
}) => {
  try {
    const abi = [
      // erc-20 functions that interest us
      'function balanceOf(address owner) view returns (uint256)',
      'function decimals() view returns (uint8)',
      'function symbol() view returns (string)',
      'function name() view returns (string)'
    ]

    const erc20 = new ethers.Contract(erc20L1orL2Address, abi, provider)
    const decimals: number = await erc20.decimals()
    const name: string = await erc20.name()
    const symbol: string = await erc20.symbol()
    const balance: BigNumber = await erc20.balanceOf(walletAddress)

    // if found valid functions in the contract, then yes, we can assume it is a valid ERC20 token
    return { name, decimals, symbol, balance }
  } catch (e) {
    // some error in fetching the token details
    // most likely the contract is either not a valid ERC20 token
    // or it doesn't exist on the network provided
    return null
  }
}

export { getL1ERC20Address, getERC20TokenDetails }
