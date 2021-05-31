import React, { useContext } from 'react'
import Networks, { Network }  from "./networks"

const NetworkContext = React.createContext("")
export const useNetwork = () => {
  const id = useContext(NetworkContext)
  return Networks[id]
}

export const useL1Network = () => {
  const network = useNetwork()
  if(!network.isArbitrum){
    return network
  } else {
    return Networks[network.partnerChainID]
  }
}

export const useL2Network = () => {
  const network = useNetwork()
  if(network.isArbitrum){
    return network
  } else {
    return Networks[network.partnerChainID]
  }
}



export default NetworkContext
