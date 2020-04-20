import Dropdown from 'react-bootstrap/Dropdown'
import DropdownButton from 'react-bootstrap/DropdownButton'
import InputGroup from 'react-bootstrap/InputGroup'
import FormControl from 'react-bootstrap/FormControl'
import Form from 'react-bootstrap/Form'
import { TokenType } from 'hooks/useArbTokenBridge'

import { useState } from 'react'

import React from 'react'
type DropDownProps = {
  erc20sCached: string[]
  addToken: (a: string, type: TokenType) => Promise<void>
}
const AssetDropDown = ({ erc20sCached, addToken }: DropDownProps) => {
  const [currentERC20, setCurrentERC20] = useState('')
  const [erc20Form, seterc20Form] = useState('')

  return (
    <DropdownButton
      as={InputGroup.Prepend}
      variant="outline-secondary"
      title={currentERC20 || 'select token'}
      id="input-group-dropdown-1"
    >
      {erc20sCached.map((address, i) => (
        <Dropdown.Item
          key={i}
          onClick={() => {
            setCurrentERC20(address)
            addToken(address, TokenType.ERC20)
          }}
        >
          {address}
        </Dropdown.Item>
      ))}
      <Dropdown.Divider />
      <Form
        onSubmit={(e: React.FormEvent<HTMLFormElement>) => {
          e.preventDefault()
          addToken(erc20Form, TokenType.ERC20)
        }}
      >
        <FormControl
          placeholder="paste token address"
          onChange={(e: any) => seterc20Form(e.target.value)}
        />
      </Form>
    </DropdownButton>
  )
}

export default AssetDropDown
