import React, { useEffect, useState } from 'react'
import { getInjectedWeb3 } from 'util/web3'
import * as ethers from 'ethers'
import App from './index'

const Injector = ()=>{
    const [provider, setProvider] = useState<ethers.providers.JsonRpcProvider>()
    useEffect(() => {
        if(!provider){
            getInjectedWeb3().then(setProvider)
        }
    }, [provider]);

    if (!provider ){
        return <div>loading</div>
    }
    // @ts-ignore
    if ( window.ethereum.networkVersion!== process.env.REACT_APP_NETWORK_ID ) {
        return <div> "bad network"</div>
    }

    return <App ethProvider={provider}/>
}
export default Injector
