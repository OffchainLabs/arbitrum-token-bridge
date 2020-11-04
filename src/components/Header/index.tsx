import React, { useEffect, useState, useCallback } from 'react'
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
    setL2Network(l2Network === "v2" ? "v1" : "v2")
  }, [l2Network])
  return (
    <div className="col-lg-12">
      <h1 className="text-center">Arbitrum Token Bridge</h1>
      <h5 className="text-center">
        Connected To {isDepositMode ? `L1. Depositing into Arb ${l2Network} chain` : `Arbitrum ${l2Network}`}{' '}
      </h5>
      <h5 className="text-center">
        <a onClick={onClick} href="" style={{ fontSize: 12 }}>
          (connect to {isDepositMode ? 'L2' : 'Layer 1'})
        </a> {" "}
      { isDepositMode && <a onClick={onSetL2Network} href="" style={{ fontSize: 12 }}>
          {`(switch to ${l2Network === "v2" ? 'Arbv1 chain' : 'Arbv2 chain'})`}
        </a>
          }
             { !isDepositMode && <a onClick={onClick} href="" style={{ fontSize: 12 }}>
            {networkId === 152709604825713 ? "(connect to Arbv1)": "(connect to Arbv2)"}
        </a>
          }
          </h5>

      <p>
        Your address:{' '}
        <span id="accountAddress">
          <ExplorerLink hash={ethAddress} type={'address'} />
        </span>
      </p>
      <p>
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
      <hr />
    </div>
  )
}

export default Header
