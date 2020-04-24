import React, { useState } from 'react'
import Tabs from 'react-bootstrap/Tabs'
import Tab from 'react-bootstrap/Tab'
import Balance from 'components/Balance'
import ERC721BalanceUi from 'components/Balance/ERC721Balance'

import { BridgeBalance, TokenType, ERC721Balance, ContractStorage, BridgeToken } from 'arb-token-bridge'
import AssetDropDown from 'components/AssetDropDown'
import EthActions from 'components/Actions/EthActions'
import ERC20Actions from 'components/Actions/ERC20Actions'
import ERC721Actions from 'components/Actions/ERC721Actions'

type TabProps = {
  ethBalances: BridgeBalance
  erc20BridgeBalance: BridgeBalance | undefined
  erc721balance: ERC721Balance | undefined
  eth: any
  token: any
  currentERC20Address: string
  currentERC721Address: string
  setCurrentERC20Address:  React.Dispatch<string>
  setCurrentERC721Address:  React.Dispatch<string>
  bridgeTokens: ContractStorage<BridgeToken>
  addToken: (a: string, type: TokenType) => Promise<string>
}

type TabName = 'eth' | 'erc20' | 'erc721'

const TabsContainer = ({
  ethBalances,
  erc20BridgeBalance,
  addToken,
  eth,
  token,
  erc721balance,
  currentERC20Address,
  bridgeTokens,
  currentERC721Address,
  setCurrentERC20Address,
  setCurrentERC721Address
}: TabProps) => {
  const [key, setKey] = useState('eth')
  // TODO: clean up / memoize
  const brideTokensArray:BridgeToken[] = Object.values(bridgeTokens)
                                        .filter((token): token is BridgeToken => !!token)
                                        .sort((a:BridgeToken, b:BridgeToken) => a.eth.symbol > b.eth.symbol ? 1 : -1)
  const erc20BridgeTokens = brideTokensArray.filter((token) => token.type === TokenType.ERC20)
  const erc721BridgeTokens = brideTokensArray.filter((token) => token.type === TokenType.ERC721)

  const currentERC20Token = bridgeTokens[currentERC20Address]
  const currentERC721Token = bridgeTokens[currentERC721Address]

  return (
    <Tabs
      id="controlled-tab-example"
      activeKey={key}
      onSelect={(k: string) => setKey(k)}
    >
      <Tab eventKey="eth" title="ETH">
        <Balance assetName={'ETH'} balances={ethBalances} />
        <EthActions balances={ethBalances} eth={eth} />
      </Tab>
      <Tab eventKey="erc20" title="ERC-20">
        <Balance assetName={'ERC20'} balances={erc20BridgeBalance} />
        <AssetDropDown
          bridgeTokensArray={erc20BridgeTokens}
          addToken={addToken}
          tokenType={TokenType.ERC20}
          currentToken={currentERC20Token}
          setCurrentAddress={setCurrentERC20Address}
        />
        <ERC20Actions
          balances={erc20BridgeBalance}
          eth={token}
          bridgeTokens={bridgeTokens}
          currentERC20Address={currentERC20Address}
        />
      </Tab>
      <Tab eventKey="erc721" title="ERC-721">
        <ERC721BalanceUi balances={erc721balance} />
        <AssetDropDown
          bridgeTokensArray={erc721BridgeTokens}
          addToken={addToken}
          tokenType={TokenType.ERC721}
          currentToken={currentERC721Token}
          setCurrentAddress={setCurrentERC721Address}

        />

        <ERC721Actions
          balances={erc721balance}
          eth={token}
          bridgeTokens={bridgeTokens}
          currentERC721Address={currentERC721Address}
        />
      </Tab>
    </Tabs>
  )
}

export default TabsContainer
