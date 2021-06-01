import React, { useCallback, useState, useMemo } from 'react'
import useCappedNumberInput from 'hooks/useCappedNumberInput'
import InputGroup from 'react-bootstrap/InputGroup'
import FormControl from 'react-bootstrap/FormControl'
import Form from 'react-bootstrap/Form'

import Dropdown from 'react-bootstrap/Dropdown'
import Tooltip from '@material-ui/core/Tooltip'

import { makeStyles } from '@material-ui/core/styles'

import { ConnextModal } from '@connext/vector-modal'
import { providers } from 'ethers'
import { connextTxn } from 'util/index'
import { AssetType } from 'token-bridge-sdk'
import ConnextIcon from 'media/images/connext.png'
import ArbIcon from 'media/images/arb.png'
import HopIcon from 'media/images/hop.png'
import { useL1Network, useL2Network } from 'components/App/NetworkContext'

const useStylesBootstrap = makeStyles(theme => ({
  tooltip: {
    fontSize: '14px'
  }
}))

const supportedConnextAssets = new Set([
  '0x0000000000000000000000000000000000000000'
  // "0xe41d965f6e7541139f8d9f331176867fb6972baf",
  // "0xf36d7a74996e7def7a6bd52b4c2fe64019dada25"
])

type WithdrawWithOptionsProps = {
  max: number
  text: string
  onSubmit: (s: string) => void
  disabled?: boolean
  buttonText?: string
  readOnlyValue?: number
  assetId?: string
  ethAddress: string
  handleConnextTxn: connextTxn
  tokenSymbol?: string
  id: number
}

const WithdrawWithOptions = ({
  max,
  text,
  onSubmit,
  disabled = false,
  buttonText,
  readOnlyValue,
  assetId = '0x0000000000000000000000000000000000000000',
  ethAddress,
  handleConnextTxn,
  tokenSymbol = '',
  id
}: WithdrawWithOptionsProps) => {
  const [value, setValue] = useCappedNumberInput(
    readOnlyValue ? readOnlyValue : 0
  )
  const [showModal, setShowModal] = useState(false)
  const submitRegular = useCallback(
    (e: any) => {
      e && e.preventDefault()
      if (!value) {
        alert('Input non-zero value to withdraw')
        return
      }
      onSubmit(value.toString())
      setValue(0, max)
    },
    [value, onSubmit]
  )

  const l1Network = useL1Network()
  const l2Network = useL2Network()

  const connextIsDisabled = useMemo(() => {
    return true
  }, [disabled])

  const connextSelect = useCallback(
    (e: any) => {
      e && e.preventDefault()
      if (connextIsDisabled) return
      if (!value) {
        alert('Input non-zero value to withdraw')
        return
      } else if (!supportedConnextAssets.has(assetId)) {
        alert('Connext ERC20 support coming soon!')
        return
      }
      setShowModal(true)
    },
    [value, assetId, connextIsDisabled]
  )

  const connextTranfserAmount = value.toString()

  const classes = useStylesBootstrap()
  const isEth = assetId === '0x0000000000000000000000000000000000000000'

  return (
    <InputGroup
      size="sm"
      className="mb-1"
      onChange={(e: any) => {
        setValue(e.target.value, max)
      }}
    >
      <ConnextModal
        showModal={showModal}
        onClose={() => setShowModal(false)}
        depositChainId={+l2Network.chainID}
        withdrawChainId={+l1Network.chainID}
        routerPublicIdentifier="vector7tbbTxQp8ppEQUgPsbGiTrVdapLdU5dH7zTbVuXRf1M4CEBU9Q"
        depositAssetId={assetId}
        withdrawAssetId={assetId}
        withdrawChainProvider={l1Network.url}
        depositChainProvider={l2Network.url}
        withdrawalAddress={ethAddress}
        injectedProvider={window.ethereum}
        transferAmount={connextTranfserAmount}
        onDepositTxCreated={(txHash: string) => {
          handleConnextTxn({
            value: value.toString(),
            txID: txHash,
            assetName: isEth ? 'ETH' : tokenSymbol,
            assetType: isEth ? AssetType.ETH : AssetType.ERC20,
            sender: ethAddress,
            type: 'connext-deposit'
          })
        }}
        onWithdrawalTxCreated={(txHash: string) => {
          handleConnextTxn({
            value: value.toString(),
            txID: txHash,
            assetName: isEth ? 'ETH' : tokenSymbol,
            assetType: isEth ? AssetType.ETH : AssetType.ERC20,
            sender: ethAddress,
            type: 'connext-withdraw'
          })
        }}
      />
      <Form>
        <FormControl
          aria-label="Small"
          aria-describedby="inputGroup-sizing-sm"
          value={value || ''}
          type="number"
          step="0.00001"
          disabled={disabled}
          placeholder={text}
          readOnly={typeof readOnlyValue === 'number'}
        />
      </Form>
      <Dropdown>
        <Dropdown.Toggle id={'dropdown-basic_' + id} className="withdraw-menu">
          Withdraw <img className="withdraw-dropdown-icon" src={ConnextIcon} />/
          <img className="withdraw-dropdown-icon" src={HopIcon} />
        </Dropdown.Toggle>

        <Dropdown.Menu>
          <Tooltip
            classes={classes}
            title="Standard withdrawal via the Arbitrum L1/L2 bridge contract."
            placement="right-end"
          >
            <Dropdown.Item onSelect={submitRegular} disabled={disabled}>
              <img className="withdraw-dropdown-icon" src={ArbIcon} />
              Bridge (Slow)
            </Dropdown.Item>
          </Tooltip>
          <Tooltip
            classes={classes}
            title="Connext-powered fast-widthdrawal via cross-chain atomic swaps!"
            placement="right-end"
          >
            <Dropdown.Item
              onSelect={connextSelect}
              disabled={connextIsDisabled}
            >
              {' '}
              <img className="withdraw-dropdown-icon" src={ConnextIcon} />{' '}
              Connext (Fast)
            </Dropdown.Item>
          </Tooltip>
          <Tooltip
            classes={classes}
            title="Hop-powered fast-withdrawal via cross-chain AMM exhanges! (Currently DAI-only)"
            placement="right-end"
          >
            <Dropdown.Item href="https://hop.exchange/" target="_blank">
              <img className="withdraw-dropdown-icon" src={HopIcon} /> Hop
              (Fast, DAI Only)
            </Dropdown.Item>
          </Tooltip>
        </Dropdown.Menu>
      </Dropdown>
    </InputGroup>
  )
}

export default WithdrawWithOptions
