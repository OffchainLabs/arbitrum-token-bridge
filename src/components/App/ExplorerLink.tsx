import React from 'react'

interface props {
    hash: string,
    type: 'address' | 'tx'
}

const ExplorerLink = ({hash, type}: props) =>{
    return <a href={`https://explorer.offchainlabs.com/#/${type}/${hash}`} target="_blank" >{hash}</a>
}

export default ExplorerLink
