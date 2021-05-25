import Dropdown from 'react-bootstrap/Dropdown'
import DropdownButton from 'react-bootstrap/DropdownButton'
import InputGroup from 'react-bootstrap/InputGroup'
import FormControl from 'react-bootstrap/FormControl'
import Feedback from 'react-bootstrap/Feedback'
import Form from 'react-bootstrap/Form'
import { TokenType, BridgeToken, TokenStatus, getTokenStatus } from 'token-bridge-sdk'
import { useState, useMemo } from 'react'

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
  const title = useMemo(() => {
    if (currentToken) {
      return currentToken.symbol
    } else if (bridgeTokensArray.length > 0) {
      return 'Add / Select Token'
    } else {
      return 'Add Token'
    }
  }, [bridgeTokensArray, currentToken])
  return (
    <DropdownButton
      as={InputGroup.Prepend}
      variant="outline-secondary"
      title={title}
      id="input-group-dropdown-1"
    >
      {bridgeTokensArray.map((bridgeToken, i) => (
        <Dropdown.Item
          key={i}
          onClick={() => {
            setCurrentAddress(
              bridgeToken.address
            )
          }}
        >
          {bridgeToken.symbol}
        </Dropdown.Item>
      ))}
      <Dropdown.Divider />
      <Form
        onSubmit={(e: React.FormEvent<HTMLFormElement>) => {
          e.preventDefault()
          const tokenStatus = getTokenStatus(erc20Form, 'kovan')
          switch (tokenStatus) {
            case TokenStatus.WHITELISTED:{
              addToken(erc20Form, tokenType)
              return seterc20Form('')
            } case TokenStatus.BLACKLISTED: {
              return alert("Token you're trying to add has features incompatible with the Arbitrum bridge")
            } case TokenStatus.NEUTRAL:{
                const res = global.confirm("We don't recognize this token; are you sure you want to add it?")
                if (!res)return
                addToken(erc20Form, tokenType)
                return seterc20Form('')
            }
    
          }


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
