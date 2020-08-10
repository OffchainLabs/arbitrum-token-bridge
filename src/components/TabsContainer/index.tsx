import React, { useState } from 'react'
import Tabs from 'react-bootstrap/Tabs'
import Tab from 'react-bootstrap/Tab'
import Container from 'react-bootstrap/Container'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'

import Balance from 'components/Balance'
import ERC721BalanceUi from 'components/Balance/ERC721Balance'

import {
  BridgeBalance,
  TokenType,
  ERC721Balance,
  ContractStorage,
  BridgeToken
} from 'arb-token-bridge'
import AssetDropDown from 'components/AssetDropDown'
import EthL1Actions from 'components/Actions/EthL1Actions'
import EthL2Actions from 'components/Actions/EthL2Actions'

import ERC20L1Actions from 'components/Actions/ERC20L1Actions'
import ERC20L2Actions from 'components/Actions/ERC20L2Actions'

import ERC721Actions from 'components/Actions/ERC721Actions'

type TabProps = {
  ethBalances: BridgeBalance
  erc20BridgeBalance: BridgeBalance | undefined
  erc721balance: ERC721Balance | undefined
  eth: any
  token: any
  currentERC20Address: string
  currentERC721Address: string
  setCurrentERC20Address: React.Dispatch<string>
  setCurrentERC721Address: React.Dispatch<string>
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
  const brideTokensArray: BridgeToken[] = Object.values(bridgeTokens)
    .filter((token): token is BridgeToken => !!token)
    .sort((a: BridgeToken, b: BridgeToken) =>
      a.eth.symbol > b.eth.symbol ? 1 : -1
    )
  const erc20BridgeTokens = brideTokensArray.filter(
    token => token.type === TokenType.ERC20
  )
  const erc721BridgeTokens = brideTokensArray.filter(
    token => token.type === TokenType.ERC721
  )

  const currentERC20Token = bridgeTokens[currentERC20Address]
  const currentERC721Token = bridgeTokens[currentERC721Address]

  return (
    <Tabs
      id="controlled-tab-example"
      activeKey={key}
      onSelect={(k: string) => setKey(k)}
    >
      <Tab eventKey="eth" title="ETH">
        <Container>
          <Row>
            <Col>
              <EthL1Actions balances={ethBalances} eth={eth} />
            </Col>
            <Col>
              <EthL2Actions balances={ethBalances} eth={eth} />
            </Col>
          </Row>
        </Container>
      </Tab>
      <Tab eventKey="erc20" title="ERC-20">
        <Container>
          <Row>
            <AssetDropDown
              bridgeTokensArray={erc20BridgeTokens}
              addToken={addToken}
              tokenType={TokenType.ERC20}
              currentToken={currentERC20Token}
              setCurrentAddress={setCurrentERC20Address}
            />
          </Row>
          <Row>
            <Col>
              <ERC20L1Actions
                balances={erc20BridgeBalance}
                eth={token}
                bridgeTokens={bridgeTokens}
                currentERC20Address={currentERC20Address}
              />
            </Col>
            <Col>
              <ERC20L2Actions
                balances={erc20BridgeBalance}
                eth={token}
                bridgeTokens={bridgeTokens}
                currentERC20Address={currentERC20Address}
              />
            </Col>
          </Row>
        </Container>
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
