import { useAppState } from '../state'

 const useTwitter = ()=>{
  const {
    app: { arbTokenBridge }
  } = useAppState()   
  const walletAddress =  arbTokenBridge.walletAddress
    const text = `ok I need @arbitrum to give me Nitro devnet gas. like VERY SOON. I cant take this, I’ve been waiting for @nitro_devnet release. I just want to start developing. but I need the gas IN MY WALLET NOW. can devs DO SOMETHING?? \r\n SEND HERE: ${walletAddress || '0x*YOUR**ETH**ADDRESS**GOES**HERE**'}`
      .split(' ')
      .join('%20')
    const handleClick = () => {
      window.open('https://twi' + `tter.com/intent/tweet?text=${text}`)
    }
    return handleClick
}

export default useTwitter

