import { useAccount, useNetwork, useSigner, WagmiConfig } from 'wagmi'
import { BigNumber, utils } from 'ethers'
import {
  lightTheme,
  RainbowKitProvider,
  ConnectButton
} from '@rainbow-me/rainbowkit'

import { getProps } from '../util/wagmi/setup'
import { PropsWithChildren, useEffect, useState } from 'react'
import {
  StaticJsonRpcProvider,
  TransactionReceipt
} from '@ethersproject/providers'

import { EthDepositStarter } from '../__experiments__/EthDepositStarter'
import { Loader } from '../components/common/atoms/Loader'
import { util } from 'zod'
import { BridgeTransferStarterFactory } from '../__experiments__/BridgeTransferStarterFactory'

const { wagmiConfigProps, rainbowKitProviderProps } = getProps(null)
console.log(wagmiConfigProps)

function Connected(props: PropsWithChildren<{ fallback: React.ReactNode }>) {
  const { isConnected } = useAccount()

  if (!isConnected) {
    return props.fallback
  }

  return props.children
}

type SmolChain = {
  name: string
  provider: StaticJsonRpcProvider
}

const goerli: SmolChain = {
  name: 'Goerli',
  provider: new StaticJsonRpcProvider(
    `https://goerli.infura.io/v3/${process.env.NEXT_PUBLIC_INFURA_KEY}`
  )
}

const arbitrumGoerli = {
  name: 'Arbitrum Goerli',
  provider: new StaticJsonRpcProvider(`https://goerli-rollup.arbitrum.io/rpc	`)
}

const ethDepositsHistory = [
  '0xa03d288446a8aa077df378ca11b4adebc9bca84cdf522d13358bd9beaaa3bcec'
]

type Balance = BigNumber | null

function Balance({ provider }: { provider: StaticJsonRpcProvider }) {
  const { address } = useAccount()
  const [balance, setBalance] = useState<BigNumber | null>(null)

  useEffect(() => {
    async function updateBalance() {
      setBalance(null)
      setBalance(await provider.getBalance(address!))
    }

    updateBalance()
  }, [address, provider])

  if (!balance) {
    return <Loader size="small" />
  }

  return <span>{utils.formatEther(balance)} ETH</span>
}

class BridgeTransfer {
  public fromChainTxHash: string
  public fromChainTxStatus: 'pending' | 'confirmed' | 'failed'

  constructor(props: { fromChainTxHash: string }) {
    this.fromChainTxHash = props.fromChainTxHash
    this.fromChainTxStatus = 'pending'
  }

  public updateWithFromChainTxReceipt(receipt: TransactionReceipt) {
    if (receipt.status === 0) {
      this.fromChainTxStatus = 'failed'
    } else {
      this.fromChainTxStatus = 'confirmed'
    }
  }
}

async function fetchFromHistory(props: {
  txHash: string
  provider: StaticJsonRpcProvider
}) {
  return props.provider.getTransactionReceipt(props.txHash)
}

function App() {
  const { address } = useAccount()
  const { data: signer } = useSigner()

  const [amount, setAmount] = useState<string>('')
  const [fromChain, setFromChain] = useState<SmolChain>(goerli)
  const [toChain, setToChain] = useState<SmolChain>(arbitrumGoerli)

  const [bridgeTransfers, setBridgeTransfers] = useState<BridgeTransfer[]>([])

  useEffect(() => {
    async function fetchTxHistory() {
      setBridgeTransfers([])
      // setBridgeTransfers(
      //   await Promise.all(
      //     ethDepositsHistory.map(async txHash => {
      //       const bridgeTransfer = new BridgeTransfer({
      //         fromChainTxHash: txHash
      //       })
      //       const txReceipt = await fromChain.provider.getTransactionReceipt(
      //         txHash
      //       )

      //       bridgeTransfer.updateWithFromChainTxReceipt(txReceipt)

      //       return bridgeTransfer
      //     })
      //   )
      // )
    }

    fetchTxHistory()
  }, [fromChain.provider])

  function swap() {
    setFromChain(toChain)
    setToChain(fromChain)
  }

  async function bridge() {
    if (!signer) {
      throw new Error('signer not found')
    }

    const starter = await BridgeTransferStarterFactory.create({
      fromChainProvider: fromChain.provider,
      toChainProvider: toChain.provider
    })

    const tx = await starter.start({
      fromChainSigner: signer,
      amount: utils.parseEther(amount)
    })

    const bridgeTransfer = new BridgeTransfer({
      fromChainTxHash: tx.hash
    })

    setBridgeTransfers([...bridgeTransfers, bridgeTransfer])

    // const txReceipt = await tx.wait()

    // bridgeTransfer.updateWithFromChainTxReceipt(txReceipt)
  }

  return (
    <div className="min-h-screen bg-white p-6 text-black">
      <h1 className="text-2xl font-medium">Experimental Bridge UI</h1>

      <Connected fallback={<ConnectButton label="Connect" />}>
        Connected: <span className="font-medium">{address}</span>
      </Connected>

      <div className="flex flex-row gap-4">
        <div className="flex min-w-[200px] flex-col">
          <span>
            From: <span className="font-medium">{fromChain.name}</span>
          </span>
          <Balance provider={fromChain.provider} />
        </div>
        <button onClick={swap}>{'<>'}</button>
        <div className="flex flex-col">
          <span>
            To: <span className="font-medium">{toChain.name}</span>
          </span>
          <Balance provider={toChain.provider} />
        </div>
      </div>

      <div className="flex max-w-[480px] flex-row gap-2">
        <input
          placeholder="amount"
          className="w-full border p-1"
          value={amount}
          onChange={event => setAmount(event.target.value)}
        />

        <button
          className="bg-black px-4 font-medium text-white"
          onClick={bridge}
        >
          Bridge
        </button>
      </div>

      <div>
        <h3 className="text-lg font-medium">Transaction History</h3>

        <ol>
          {bridgeTransfers.map(bridgeTransfer => (
            <li key={bridgeTransfer.fromChainTxHash}>
              <div className="flex flex-row items-center gap-2">
                <span className="font-medium">
                  fromChainTxHash: {bridgeTransfer.fromChainTxHash}
                </span>
                <span className="font-medium">
                  fromChainTxStatus: {bridgeTransfer.fromChainTxStatus}
                </span>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}

export default function Experiment() {
  return (
    <WagmiConfig {...wagmiConfigProps}>
      <RainbowKitProvider theme={lightTheme()} {...rainbowKitProviderProps}>
        <App />
      </RainbowKitProvider>
    </WagmiConfig>
  )
}

Experiment.displayName = 'Experiment'
