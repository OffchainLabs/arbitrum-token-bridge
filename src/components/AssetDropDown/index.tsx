import Dropdown from 'react-bootstrap/Dropdown'
import DropdownButton from 'react-bootstrap/DropdownButton'
import InputGroup from 'react-bootstrap/InputGroup'
import FormControl from 'react-bootstrap/FormControl'
import Feedback from 'react-bootstrap/Feedback'
import Form from 'react-bootstrap/Form'
import { TokenType, BridgeToken } from 'arb-token-bridge'
import { useState, useLayoutEffect } from 'react'

import React from 'react'
type DropDownProps = {
  bridgeTokensArray: BridgeToken[]
  tokenType: TokenType
  addToken: (a: string, type: TokenType) => Promise<string>
  currentToken: BridgeToken | undefined
  setCurrentAddress: React.Dispatch<string>
}

// TODO: ethers v5 has an isAddress util
const looksLikeAddress = (address: string) =>
  address.startsWith('0x') && address.length === 42

const AssetDropDown = ({
  bridgeTokensArray,
  addToken,
  tokenType,
  currentToken,
  setCurrentAddress
}: DropDownProps) => {
  const [erc20Form, seterc20Form] = useState('')
  return (
    <DropdownButton
      as={InputGroup.Prepend}
      variant="outline-secondary"
      title={currentToken ? currentToken.symbol : 'select token'}
      id="input-group-dropdown-1"
    >
      {bridgeTokensArray.map((bridgeToken, i) => (
        <Dropdown.Item
          key={i}
          onClick={() => {
            setCurrentAddress(bridgeToken!.eth.address)
          }}
        >
          {bridgeToken.symbol}
        </Dropdown.Item>
      ))}
      <Dropdown.Divider />
      <Form
        onSubmit={(e: React.FormEvent<HTMLFormElement>) => {
          e.preventDefault()
          addToken(erc20Form, tokenType)
          seterc20Form('')
        }}
      >
        <FormControl
          isInvalid={!!erc20Form && !looksLikeAddress(erc20Form)}
          isValid={!!erc20Form && looksLikeAddress(erc20Form)}
          placeholder="paste token address"
          onChange={(e: any) => seterc20Form(e.target.value)}
          value={erc20Form}
        />
        <Feedback type="valid">press enter to add token</Feedback>
        <Feedback type="invalid">invalid address</Feedback>
      </Form>
    </DropdownButton>
  )
}

export default AssetDropDown
