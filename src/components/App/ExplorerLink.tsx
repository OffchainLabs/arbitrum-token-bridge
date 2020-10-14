import React from 'react'

interface props {
    hash: string,
    type: 'address' | 'tx' | 'l1-tx' | 'chain'
}

const ExplorerLink = ({hash, type}: props) =>{

    const url = type === 'l1-tx' ? `https://kovan.etherscan.io/tx/${hash}`  : `https://explorer.offchainlabs.com/#/${type}/${hash}`
    return <a href={url} target="_blank" >{hash}</a>
}

export default ExplorerLink
