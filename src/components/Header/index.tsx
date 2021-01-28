import React, { useEffect, useState, useCallback, useMemo } from 'react'
import {
  BridgeBalance,
  ERC721Balance,
  ContractStorage,
  BridgeToken
} from 'token-bridge-sdk'
import { formatEther } from 'ethers/utils'
import { useIsDepositMode } from 'components/App/ModeContext'
import ExplorerLink from 'components/App/ExplorerLink'
import { l2Network } from 'util/index'
interface Web3Data {
  ethAddress: string
  vmId: string
  ethBalance: BridgeBalance | undefined
  erc20Balance: BridgeBalance | undefined
  erc721Balance: ERC721Balance | undefined
  bridgeTokens: ContractStorage<BridgeToken>
  currentERC20Address: string
  currentERC721Address: string
  l2Network: l2Network
  setL2Network: any
  networkId: number
}

const Header = ({
  ethAddress,
  vmId,
  ethBalance,
  erc20Balance,
  erc721Balance,
  bridgeTokens,
  currentERC20Address,
  currentERC721Address,
  l2Network,
  setL2Network,
  networkId

}: Web3Data) => {
  const currentERC20 = bridgeTokens[currentERC20Address]
  const erc20Symbol = currentERC20 ? currentERC20.symbol : ''

  const currentERC721 = bridgeTokens[currentERC721Address]
  const erc721Symbol = currentERC721 ? currentERC721.symbol : ''
  const isDepositMode = useIsDepositMode()

  const onClick = (e: any) => {
    e.preventDefault()
    window.open(window.location.origin + '#info')
  }

  const onSetL2Network = useCallback(()=>{
    setL2Network(l2Network === "v2" ? "v3" : "v2")
  }, [l2Network])
  const headerDisplay = useMemo(()=>{
    if (networkId === 666){
      return "connecting..."
    }
    if (isDepositMode){
      return `Connected to L1. Depositing into Arb ${l2Network} chain`
    }

    return `Connected to Arbitrum ${networkId === 152709604825713 ? "v2" : "v3"}`
  }, [isDepositMode, l2Network, networkId])

  return (
    <div className="col-lg-12">
      <div className="top-thing">  <a href="http://portal.arbitrum.io/" target="_blank">DAPPS</a> . <a href="http://faucet.arbitrum.io/" target="_blank">FAUCET</a></div>

      <h1 className="text-center">Arbitrum Token Bridge</h1>
      <h5 className="text-center">
        
      { headerDisplay}
      </h5>
      <h5 className="text-center">
        <a onClick={onClick} href="" style={{ fontSize: 12, fontFamily: 'Montserrat Light'}}>
          (connect to {isDepositMode ? 'L2' : 'Layer 1'})
        </a> {" "}
      { isDepositMode && <a onClick={onSetL2Network} href="" style={{ fontSize: 12, fontFamily: 'Montserrat Light' }}>
          {`(switch to ${l2Network === "v2" ? 'Arbv3 chain' : 'Arbv2 chain'})`}
        </a>
          }
             { !isDepositMode && <a onClick={onClick} href="" style={{ fontSize: 12, fontFamily: 'Montserrat Light' }}>
            {networkId === 152709604825713 ? "(connect to Arbv3)": "(connect to Arbv2)"}
        </a>
          }
          </h5>
<div className="address-container">
      <p className="address">
        Your address:{' '}
        <span id="accountAddress">
          <ExplorerLink hash={ethAddress} type={'address'} />
        </span>
      </p>
      <p className="arbchain">
        Address of ArbChain:{' '}
        <span id="rollupAddress">
          <ExplorerLink hash={vmId} type={'chain'} />
        </span>
      </p>
      {/* {ethBalance && (
        <p>
          Total ETH On Arb Chain:{' '}
          <span>{formatEther(ethBalance.totalArbBalance)}</span>
        </p>
      )}
      {erc20Balance && (
        <p>
          Total {erc20Symbol} On Arb Chain:{' '}
          <span>{formatEther(erc20Balance.totalArbBalance)}</span>
        </p>
      )}
      {erc721Balance && (
        <p>
          Total # of {erc721Symbol} NFTs On Arb Chain:{' '}
          <span>{erc721Balance.totalArbTokens.length}</span>
        </p>
      )} */}
      
      </div><hr/>
    </div>

  )
}

export default Header
