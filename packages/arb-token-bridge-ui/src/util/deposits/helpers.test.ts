import { updateAdditionalDepositData } from './helpers'
import { Transaction } from '../../types/Transactions'
import { AssetType } from '../../hooks/arbTokenBridge.types'

describe('updateAdditionalDepositData', () => {
  // Helper to create a minimal Transaction object
  const makeTx = (overrides: Partial<Transaction>): Transaction => ({
    type: 'deposit-l1',
    status: 'pending',
    direction: 'deposit',
    source: 'subgraph',
    value: '0',
    txID: '',
    tokenAddress: '',
    sender: '',
    destination: '',
    assetName: '',
    assetType: AssetType.ETH,
    l1NetworkID: '',
    l2NetworkID: '',
    blockNumber: undefined,
    timestampCreated: undefined,
    isClassic: false,
    parentChainId: 0,
    childChainId: 0,
    ...overrides
  })

  // --- TELEPORT TRANSACTIONS ---
  it('ETH teleport (L1 -> L3)', async () => {
    // TODO: Fill in tx hash and expected output
    const txHash = '' // <-- supply ETH teleport tx hash
    const tx = makeTx({
      txID: txHash,
      parentChainId: 1, // e.g. Ethereum mainnet
      childChainId: 421614, // e.g. Arbitrum Orbit chain
      assetType: AssetType.ETH
      // ...other fields as needed
    })
    const result = await updateAdditionalDepositData(tx)
    // result is intentionally unused until you fill in the expect statement
    // expect(result).toMatchObject({ ... }) // <-- fill in expected output
  })

  it('ERC20 teleport (L1 -> L3)', async () => {
    const txHash = '' // <-- supply ERC20 teleport tx hash
    const tx = makeTx({
      txID: txHash,
      parentChainId: 1,
      childChainId: 421614,
      assetType: AssetType.ERC20,
      tokenAddress: '' // <-- fill in token address
    })
    const result = await updateAdditionalDepositData(tx)
    // result is intentionally unused until you fill in the expect statement
    // expect(result).toMatchObject({ ... })
  })

  // --- CLASSIC (PRE-NITRO) DEPOSITS ---
  it('Classic ETH deposit', async () => {
    const txHash = '' // <-- supply classic ETH deposit tx hash
    const tx = makeTx({
      txID: txHash,
      parentChainId: 1,
      childChainId: 42161,
      assetType: AssetType.ETH,
      isClassic: true
    })
    const result = await updateAdditionalDepositData(tx)
    // result is intentionally unused until you fill in the expect statement
    // expect(result).toMatchObject({ ... })
  })

  it('Classic ERC20 deposit', async () => {
    const txHash = '' // <-- supply classic ERC20 deposit tx hash
    const tx = makeTx({
      txID: txHash,
      parentChainId: 1,
      childChainId: 42161,
      assetType: AssetType.ERC20,
      isClassic: true,
      tokenAddress: '' // <-- fill in token address
    })
    const result = await updateAdditionalDepositData(tx)
    // result is intentionally unused until you fill in the expect statement
    // expect(result).toMatchObject({ ... })
  })

  // --- NITRO DEPOSITS ---
  it('Nitro ETH deposit to same address', async () => {
    const txHash = '' // <-- supply nitro ETH deposit tx hash
    const tx = makeTx({
      txID: txHash,
      parentChainId: 1,
      childChainId: 42161,
      assetType: AssetType.ETH,
      isClassic: false
    })
    const result = await updateAdditionalDepositData(tx)
    // result is intentionally unused until you fill in the expect statement
    // expect(result).toMatchObject({ ... })
  })

  it('Nitro ETH deposit to custom address', async () => {
    const txHash = '' // <-- supply nitro ETH deposit to custom address tx hash
    const tx = makeTx({
      txID: txHash,
      parentChainId: 1,
      childChainId: 42161,
      assetType: AssetType.ETH,
      isClassic: false,
      destination: '' // <-- fill in custom destination address
    })
    const result = await updateAdditionalDepositData(tx)
    // result is intentionally unused until you fill in the expect statement
    // expect(result).toMatchObject({ ... })
  })

  it('Nitro ERC20 deposit', async () => {
    const txHash = '' // <-- supply nitro ERC20 deposit tx hash
    const tx = makeTx({
      txID: txHash,
      parentChainId: 1,
      childChainId: 42161,
      assetType: AssetType.ERC20,
      isClassic: false,
      tokenAddress: '' // <-- fill in token address
    })
    const result = await updateAdditionalDepositData(tx)
    // result is intentionally unused until you fill in the expect statement
    // expect(result).toMatchObject({ ... })
  })

  // --- BATCH TRANSFER CASES ---
  it('ERC20 deposit with extra ETH (batch transfer, value2 calculated)', async () => {
    const txHash = '' // <-- supply batch ERC20 deposit tx hash
    const tx = makeTx({
      txID: txHash,
      parentChainId: 1,
      childChainId: 42161,
      assetType: AssetType.ERC20,
      isClassic: false,
      tokenAddress: '' // <-- fill in token address
    })
    const result = await updateAdditionalDepositData(tx)
    // result is intentionally unused until you fill in the expect statement
    // expect(result.value2).toBe(/* expected value2 */)
  })
})
