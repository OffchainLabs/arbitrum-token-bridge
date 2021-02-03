import React, { useCallback, useState } from 'react'
import useCappedNumberInput from 'hooks/useCappedNumberInput'
import InputGroup from 'react-bootstrap/InputGroup'
import FormControl from 'react-bootstrap/FormControl'
import Button from 'react-bootstrap/Button'

import Form from 'react-bootstrap/Form'

import Dropdown from 'react-bootstrap/Dropdown'
import Tooltip from 'react-bootstrap/Tooltip'

import { ConnextModal } from '@connext/vector-modal'
import networks from '../App/networks'


const l1RpcUrl = process.env.REACT_APP_ETH_NODE_URL as string
const l1NetworkId = process.env.REACT_APP_ETH_NETWORK_ID as string
// TODO: disable on old testnet chain? 
const l2NetworkId = process.env.REACT_APP_ARB_NETWORK_ID as string

type WithdrawWithOptionsProps = {
  max: number
  text: string
  onSubmit: (s: string) => void
  disabled?: boolean
  buttonText?: string
  readOnlyValue?: number
  assetId?: string,
  ethAddress: string

}

const WithdrawWithOptions = ({
  max,
  text,
  onSubmit,
  disabled = false,
  buttonText,
  readOnlyValue,
  assetId = "0x0000000000000000000000000000000000000000",
  ethAddress
}: WithdrawWithOptionsProps) => {
  const [value, setValue] = useCappedNumberInput(
    readOnlyValue ? readOnlyValue : 0
  )

  const [showModal, setShowModal] = useState(false)
  const submitRegular = useCallback(
    (e: any) => {
      e && e.preventDefault()
      onSubmit(value.toString())
      setValue(0, max)
    },
    [value, onSubmit]
  )
  const connextSelect = (e:any)=>{
    e && e.preventDefault();
    setShowModal(true)

  }

  const connextIsDisabled = disabled || !value
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
                depositChainId={+l2NetworkId}
                withdrawChainId={+l1NetworkId}
                routerPublicIdentifier="vector7tbbTxQp8ppEQUgPsbGiTrVdapLdU5dH7zTbVuXRf1M4CEBU9Q"
                depositAssetId={assetId}
                withdrawAssetId={assetId}
                withdrawChainProvider={l1RpcUrl}
                depositChainProvider={networks[+l2NetworkId].url}
                withdrawalAddress={ethAddress}
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
      {/* <Button disabled={disabled} type="submit" onClick={submit}>
        {buttonText || 'submit'}
      </Button> */}

        <Dropdown>
        <Dropdown.Toggle id="dropdown-basic" className="withdraw-menu">
            Withdraw
        </Dropdown.Toggle>

        <Dropdown.Menu  >
            <Dropdown.Item onSelect={submitRegular} disabled={disabled || value === 0}>Withdraw (Regular)</Dropdown.Item>
            <Dropdown.Item onSelect={connextSelect} disabled={connextIsDisabled}> Connext Fast Withdraw</Dropdown.Item>
            <Dropdown.Item href="https://hop.exchange/" target="_blank">Hop Fast Withdraw</Dropdown.Item>
        </Dropdown.Menu>
        </Dropdown>
    </InputGroup>
  )
}

export default WithdrawWithOptions
