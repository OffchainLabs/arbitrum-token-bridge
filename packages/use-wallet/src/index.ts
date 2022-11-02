import { useCallback } from 'react'
import Web3Modal, { ICoreOptions } from 'web3modal'
import { Network, Web3Provider } from '@ethersproject/providers'
import create from 'zustand'

type State = {
  provider: Web3Provider
  account: Account
  network: Network
  web3Modal: Web3Modal
}

const useStore = create<Partial<State>>(_set => ({
  web3Modal: typeof window !== 'undefined' ? new Web3Modal() : undefined
}))

type Account = string
type ConnectWallet = (opts?: Partial<ICoreOptions>) => Promise<State>
type DisconnectWallet = () => void
type UseWallet = () => Partial<State> & {
  connect: ConnectWallet
  disconnect: DisconnectWallet
}

export const useWallet: UseWallet = () => {
  // Retreive the current values from the store, and automatically re-render on updates
  const account = useStore(state => state.account)
  const network = useStore(state => state.network)
  const provider = useStore(state => state.provider)
  const web3Modal = useStore(state => state.web3Modal)

  const connect: ConnectWallet = useCallback(async opts => {
    // Launch modal with the given options
    const web3Modal = new Web3Modal(opts)
    const web3ModalProvider = await web3Modal.connect()

    // Set up Ethers provider and initial state with the response from the web3Modal
    const initialProvider = new Web3Provider(web3ModalProvider, 'any')
    const getNetwork = () => initialProvider.getNetwork()
    const initialAccounts = await initialProvider.listAccounts()
    const initialNetwork = await getNetwork()

    const nextState = {
      web3Modal,
      provider: initialProvider,
      network: initialNetwork,
      account: initialAccounts[0]
    }

    // Set up event listeners to handle state changes
    web3ModalProvider.on('accountsChanged', (accounts: string[]) => {
      useStore.setState({ account: accounts[0] })
    })

    web3ModalProvider.on('chainChanged', async (_chainId: string) => {
      const network = await getNetwork()
      useStore.setState({ network })
    })

    web3ModalProvider.on('disconnect', () => {
      web3Modal.clearCachedProvider()
    })

    useStore.setState(nextState)
    return nextState
  }, [])

  const disconnect: DisconnectWallet = useCallback(async () => {
    web3Modal?.clearCachedProvider()
    useStore.setState({
      provider: undefined,
      network: undefined,
      account: undefined
    })
  }, [web3Modal])

  return {
    connect,
    provider,
    account,
    network,
    disconnect,
    web3Modal
  }
}
