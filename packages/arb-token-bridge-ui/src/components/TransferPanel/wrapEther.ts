import { getArbitrumNetwork } from '@arbitrum/sdk'
import { BigNumber, ethers, Signer } from 'ethers'

const WETH_ABI = [
  {
    constant: false,
    inputs: [],
    name: 'deposit',
    outputs: [],
    payable: true,
    stateMutability: 'payable',
    type: 'function'
  }
]

export async function wrapEther({
  signer,
  sourceChainId,
  amount
}: {
  signer: Signer
  sourceChainId: number
  amount: string | number
}) {
  const wethAddress = getArbitrumNetwork(sourceChainId).tokenBridge?.childWeth

  if (!wethAddress) {
    console.log('Weth address missing!')
    return
  }

  try {
    // Create WETH contract instance
    const wethContract = new ethers.Contract(wethAddress, WETH_ABI, signer)

    // Convert ETH amount to Wei
    const amountInWei = ethers.utils.parseEther(amount.toString())

    // Call deposit function with ETH value
    const tx = await wethContract.deposit({
      value: amountInWei
    })

    // Wait for transaction confirmation
    const receipt = await tx.wait()

    console.log(`Successfully wrapped ${amount} ETH to WETH`)
    console.log(`Transaction hash: ${receipt.transactionHash}`)

    return receipt
  } catch (error) {
    console.error('Error wrapping ETH:', error)
    throw error
  }
}
