import { useAccount, useSigner, WagmiConfig } from 'wagmi'
import { BigNumber, utils } from 'ethers'
import {
  lightTheme,
  RainbowKitProvider,
  ConnectButton
} from '@rainbow-me/rainbowkit'

import { getProps } from '../util/wagmi/setup'
import { PropsWithChildren, useEffect, useState } from 'react'
import { StaticJsonRpcProvider } from '@ethersproject/providers'

import { Loader } from '../components/common/atoms/Loader'
import { BridgeTransfer } from '../__experiments__/BridgeTransfer'
import { BridgeTransferStarterFactory } from '../__experiments__/BridgeTransferStarterFactory'

const { wagmiConfigProps, rainbowKitProviderProps } = getProps(null)

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

type TxHistoryEntry = {
  type: `${'eth' | 'erc-20'}-${'deposit' | 'withdrawal'}`
  txHash: string
}

function BridgeTransferListItem({
  bridgeTransfer
}: {
  bridgeTransfer: BridgeTransfer
}) {
  return (
    <li key={bridgeTransfer.sourceChainTx.hash}>
      <div className="flex flex-row items-center gap-2">
        <span className="font-medium">
          sourceChainTxHash: {bridgeTransfer.sourceChainTx.hash}
        </span>
        <span className="font-medium">
          destinationChainTxHash:{' '}
          {bridgeTransfer.destinationChainTxReceipt?.transactionHash ?? '?'}
        </span>
        <span className="font-medium">status: {bridgeTransfer.status}</span>
      </div>
    </li>
  )
}

function App() {
  const { address } = useAccount()
  const { data: signer } = useSigner()

  const [amount, setAmount] = useState<string>('')
  const [erc20, setErc20] = useState<string>('')
  const [fromChain, setFromChain] = useState<SmolChain>(goerli)
  const [toChain, setToChain] = useState<SmolChain>(arbitrumGoerli)

  const [bridgeTransferMap, setBridgeTransferMap] = useState<
    Record<string, BridgeTransfer>
  >({})

  function swap() {
    setFromChain(toChain)
    setToChain(fromChain)
  }

  async function bridge() {
    if (!signer) {
      throw new Error('signer not found')
    }

    const sourceChainErc20ContractAddress = erc20 !== '' ? erc20 : undefined

    const bridgeTransferStarter = await BridgeTransferStarterFactory.create({
      sourceChainProvider: fromChain.provider,
      destinationChainProvider: toChain.provider,
      sourceChainErc20ContractAddress
    })

    const startProps = {
      sourceChainSigner: signer,
      amount: utils.parseEther(amount)
    }

    if (await bridgeTransferStarter.requiresApproval(startProps)) {
      const approvalTx = await bridgeTransferStarter.approve(startProps)
      await approvalTx.wait()
    }

    const bridgeTransfer = await bridgeTransferStarter.start(startProps)

    setBridgeTransferMap(prevBridgeTransferMap => ({
      ...prevBridgeTransferMap,
      [bridgeTransfer.sourceChainTx.hash]: bridgeTransfer
    }))

    bridgeTransfer.pollForStatus({
      onChange: _bridgeTranfer =>
        setBridgeTransferMap(prevBridgeTransferMap => ({
          ...prevBridgeTransferMap,
          [_bridgeTranfer.sourceChainTx.hash]: _bridgeTranfer
        }))
    })
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

      <div className="flex max-w-[480px] flex-col gap-2">
        <input
          placeholder="erc-20 address"
          className="w-full border p-1"
          value={erc20}
          onChange={event => setErc20(event.target.value)}
        />

        <input
          placeholder="amount"
          className="w-full border p-1"
          value={amount}
          onChange={event => setAmount(event.target.value)}
        />

        <button
          className="bg-black px-4 py-2 font-medium text-white"
          onClick={bridge}
        >
          Bridge
        </button>
      </div>

      <div>
        <h3 className="text-lg font-medium">Transaction History</h3>

        <ol>
          {Object.values(bridgeTransferMap).map((bridgeTransfer, index) => (
            <BridgeTransferListItem
              key={index}
              bridgeTransfer={bridgeTransfer}
            />
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
