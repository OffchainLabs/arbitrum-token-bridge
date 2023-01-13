import { useAppState } from '../state'

const useTwitter = () => {
  const {
    app: { arbTokenBridge }
  } = useAppState()
  const walletAddress = arbTokenBridge.walletAddress
  const text =
    `Ok I need @arbitrum to give me Arbitrum Goerli testnet gas. I can't wait to start developing on @nitro_devnet. \r\n SEND HERE: ${
      walletAddress ?? '0x*YOUR**ETH**ADDRESS**GOES**HERE**'
    }`
      .split(' ')
      .join('%20')
  const handleClick = () => {
    window.open(`https://twitter.com/intent/tweet?text=${text}`)
  }
  return handleClick
}

export default useTwitter
