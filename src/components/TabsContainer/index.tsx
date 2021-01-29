import React, { useState } from 'react'
import Tabs from 'react-bootstrap/Tabs'
import Tab from 'react-bootstrap/Tab'
import Container from 'react-bootstrap/Container'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'
import Button from 'react-bootstrap/Button'
import PanelWrapper from './PanelWrapper'
import Balance from 'components/Balance'
import ERC721BalanceUi from 'components/Balance/ERC721Balance'

import {
  BridgeBalance,
  TokenType,
  ERC721Balance,
  ContractStorage,
  BridgeToken
} from 'token-bridge-sdk'
import { ConnextModal } from '@connext/vector-modal'

import AssetDropDown from 'components/AssetDropDown'
import EthL1Actions from 'components/Actions/EthL1Actions'
import EthL2Actions from 'components/Actions/EthL2Actions'

import ERC20L1Actions from 'components/Actions/ERC20L1Actions'
import ERC20L2Actions from 'components/Actions/ERC20L2Actions'

import ERC721L1Actions from 'components/Actions/ERC721L1Actions'
import ERC721L2Actions from 'components/Actions/ERC721L2Actions'
import { Transaction } from 'token-bridge-sdk'

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
  transactions: Transaction[]
  networkId: number
}

type TabName = 'eth' | 'erc20' | 'erc721' | 'connext'

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
  setCurrentERC721Address,
  transactions,
  networkId
}: TabProps) => {
  const [key, setKey] = useState('eth')
  const [showModal, setShowModal] = React.useState(false)
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
  const disabledWithdrawals = networkId === 152709604825713

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
              <PanelWrapper isDepositPanel={true}>
                <EthL1Actions
                  balances={ethBalances}
                  eth={eth}
                  transactions={transactions}
                />
              </PanelWrapper>
            </Col>
            <Col>
              <PanelWrapper
                isDepositPanel={false}
                disabledWithdrawals={disabledWithdrawals}
              >
                <EthL2Actions balances={ethBalances} eth={eth} />
              </PanelWrapper>
            </Col>
          </Row>
        </Container>
      </Tab>
      <Tab eventKey="erc20" title="ERC-20">
        <Container>
          <Row>
            <Col>
              <AssetDropDown
                bridgeTokensArray={erc20BridgeTokens}
                addToken={addToken}
                tokenType={TokenType.ERC20}
                currentToken={currentERC20Token}
                setCurrentAddress={setCurrentERC20Address}
              />
            </Col>
          </Row>
          <Row>
            <Col>
              <PanelWrapper isDepositPanel={true}>
                <ERC20L1Actions
                  balances={erc20BridgeBalance}
                  eth={token}
                  bridgeTokens={bridgeTokens}
                  currentERC20Address={currentERC20Address}
                  transactions={transactions}
                />
              </PanelWrapper>
            </Col>
            <Col>
              <PanelWrapper
                isDepositPanel={false}
                disabledWithdrawals={disabledWithdrawals}
              >
                <ERC20L2Actions
                  balances={erc20BridgeBalance}
                  eth={token}
                  bridgeTokens={bridgeTokens}
                  currentERC20Address={currentERC20Address}
                />
              </PanelWrapper>
            </Col>
          </Row>
        </Container>
      </Tab>
      <Tab eventKey="erc721" title="ERC-721">
        <Container>
          <Row>
            <Col>
              <ERC721BalanceUi
                balances={erc721balance}
                transactions={transactions}
                bridgeTokens={bridgeTokens}
                currentERC721Address={currentERC721Address}
              />
            </Col>
          </Row>
          <Row>
            <Col>
              <AssetDropDown
                bridgeTokensArray={erc721BridgeTokens}
                addToken={addToken}
                tokenType={TokenType.ERC721}
                currentToken={currentERC721Token}
                setCurrentAddress={setCurrentERC721Address}
              />
            </Col>
          </Row>
          <Row>
            <Col>
              <PanelWrapper isDepositPanel={true}>
                <ERC721L1Actions
                  balances={erc721balance}
                  eth={token}
                  bridgeTokens={bridgeTokens}
                  currentERC721Address={currentERC721Address}
                />
              </PanelWrapper>
            </Col>
            <Col>
              <PanelWrapper
                isDepositPanel={false}
                disabledWithdrawals={disabledWithdrawals}
              >
                <ERC721L2Actions
                  balances={erc721balance}
                  eth={token}
                  bridgeTokens={bridgeTokens}
                  currentERC721Address={currentERC721Address}
                />
              </PanelWrapper>
            </Col>
          </Row>
        </Container>
      </Tab>
      <Tab eventKey="connext" title="Connext">
        <Container>
          <Row>
            <Col>
              <Button
                variant="outline-primary"
                onClick={() => setShowModal(true)}
              >
                Deposit
              </Button>
              <ConnextModal
                showModal={showModal}
                onClose={() => setShowModal(false)}
                depositChainId={42}
                withdrawChainId={79377087078960}
                routerPublicIdentifier="vector7tbbTxQp8ppEQUgPsbGiTrVdapLdU5dH7zTbVuXRf1M4CEBU9Q"
                depositAssetId={'0x0000000000000000000000000000000000001010'}
                withdrawAssetId={'0x0000000000000000000000000000000000001010'}
                depositChainProvider="https://kovan.infura.io/v3/69be236133a447618748325072aeb7e3"
                withdrawChainProvider="https://kovan3.arbitrum.io/rpc"
                withdrawalAddress={'0x75e4DD0587663Fce5B2D9aF7fbED3AC54342d3dB'}
              />
            </Col>
          </Row>
        </Container>
      </Tab>
    </Tabs>
  )
}

export default TabsContainer
