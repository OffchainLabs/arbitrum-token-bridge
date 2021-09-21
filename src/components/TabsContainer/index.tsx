import React from 'react'
import Tabs from 'react-bootstrap/Tabs'
import Tab from 'react-bootstrap/Tab'
import Container from 'react-bootstrap/Container'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'
import PanelWrapper from './PanelWrapper'
import ExplorerLink from 'components/App/ExplorerLink'
import { connextTxn } from 'util/index'
import { PendingWithdrawalsMap } from 'token-bridge-sdk'
import { PendingWithdrawalsLoadedState } from 'util/index'

import {
  BridgeBalance,
  TokenType,
  ContractStorage,
  BridgeToken
} from 'token-bridge-sdk'

import AssetDropDown from 'components/AssetDropDown'
import EthL1Actions from 'components/Actions/EthL1Actions'
import EthL2Actions from 'components/Actions/EthL2Actions'

import ERC20L1Actions from 'components/Actions/ERC20L1Actions'
import ERC20L2Actions from 'components/Actions/ERC20L2Actions'

import { Transaction } from 'token-bridge-sdk'

import { providers } from 'ethers'
import { useLocalStorage } from '@rehooks/local-storage'
import { useL1Network } from 'components/App/NetworkContext'

type TabProps = {
  ethBalances: BridgeBalance
  erc20BridgeBalance: BridgeBalance | undefined
  eth: any
  token: any
  currentERC20Address: string
  setCurrentERC20Address: React.Dispatch<string>
  bridgeTokens: ContractStorage<BridgeToken>
  addToken: (a: string, type: TokenType) => Promise<string>
  transactions: Transaction[]
  ethAddress: string
  handleConnextTxn?: connextTxn
  pendingWithdrawalsMap: PendingWithdrawalsMap
  ethProvider: providers.Provider
  pwLoadedState: PendingWithdrawalsLoadedState
}

type TabName = 'eth' | 'erc20' | 'erc721'

const TabsContainer = ({
  ethBalances,
  erc20BridgeBalance,
  addToken,
  eth,
  token,
  currentERC20Address,
  bridgeTokens,
  setCurrentERC20Address,
  transactions,
  ethAddress,
  handleConnextTxn,
  pendingWithdrawalsMap,
  ethProvider,
  pwLoadedState
}: TabProps) => {
  const [key, setKey] = useLocalStorage('currentTab', 'eth')
  const [showModal, setShowModal] = React.useState(false)
  // TODO: clean up / memoize
  const brideTokensArray: BridgeToken[] = Object.values(bridgeTokens)
    .filter((token): token is BridgeToken => !!token)
    .sort((a: BridgeToken, b: BridgeToken) => {
      if (a.symbol === b.symbol) {
        const Aaddress = a.address
        const Baddress = b.address
        return Aaddress > Baddress ? 1 : -1
      }

      return a.symbol > b.symbol ? 1 : -1
    })
  const erc20BridgeTokens = brideTokensArray.filter(
    token => token.type === TokenType.ERC20
  )


  const currentERC20Token = bridgeTokens[currentERC20Address]
  const disabledWithdrawals = false

  const currentTokenL2Address =
    (currentERC20Token && currentERC20Token.l2Address) || null

  const l1ChainId = useL1Network().chainID

  return (
    <Tabs
      id="controlled-tab-example"
      activeKey={key}
      onSelect={(k: string | null) => setKey(k || key)}
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
                  pendingWithdrawalsMap={pendingWithdrawalsMap}
                  ethProvider={ethProvider}
                  pwLoadedState={pwLoadedState}
                />
              </PanelWrapper>
            </Col>
            <Col>
              <PanelWrapper
                isDepositPanel={false}
                disabledWithdrawals={disabledWithdrawals}
              >
                <EthL2Actions
                  balances={ethBalances}
                  eth={eth}
                  ethAddress={ethAddress}
                />
              </PanelWrapper>
            </Col>
          </Row>
        </Container>
      </Tab>
      {true ? (
        <Tab eventKey="erc20" title="ERC-20">
          <Container>
            <Row md={6}>
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
            <Row style={{ fontSize: 14 }}>
              {currentERC20Token ? (
                <Col>
                  Token L1 Address:{' '}
                  <ExplorerLink
                    hash={currentERC20Address}
                    type={'address'}
                    layer={1}
                  />
                </Col>
              ) : null}
            </Row>
            <Row style={{ fontSize: 14 }}>
              {currentTokenL2Address ? (
                <Col>
                  Token L2 Address:{' '}
                  <ExplorerLink
                    hash={currentTokenL2Address}
                    type={'address'}
                    layer={2}
                  />
                </Col>
              ) : null}
            </Row>

            <Row>
              <Col>
                <PanelWrapper isDepositPanel={true}>
                  <ERC20L1Actions
                    balances={erc20BridgeBalance}
                    token={token}
                    bridgeTokens={bridgeTokens}
                    currentERC20Address={currentERC20Address}
                    transactions={transactions}
                    pendingWithdrawalsMap={pendingWithdrawalsMap}
                    ethProvider={ethProvider}
                    pwLoadedState={pwLoadedState}

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
                    ethAddress={ethAddress}
                  />
                </PanelWrapper>
              </Col>
            </Row>
          </Container>
        </Tab>
      ) : null}

    </Tabs>
  )
}

export default TabsContainer
