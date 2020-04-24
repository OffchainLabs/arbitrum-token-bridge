import React from 'react'
import InputGroup from 'react-bootstrap/InputGroup'
import FormControl from 'react-bootstrap/FormControl'
import DropdownButton from 'react-bootstrap/DropdownButton'
import Dropdown from 'react-bootstrap/Dropdown'
import Button from 'react-bootstrap/Button'

import Form from 'react-bootstrap/Form'
import { BigNumber } from 'ethers/utils'
import { useState } from 'react'

type DropdownInputFormProps = {
  items: BigNumber[]
  text: string
  onSubmit: (s: string) => void
  disabled?: boolean,
  action: string
}

const DropdownInputForm = ({
  items,
  text,
  onSubmit,
  action,
  disabled = false
}: DropdownInputFormProps) => {
  const [value, setValue] = useState(0)

  return (
    <InputGroup size="sm" className="mb-3">
      <InputGroup.Prepend>
        <InputGroup.Text id="inputGroup-sizing-sm">{text}</InputGroup.Text>
      </InputGroup.Prepend>
      <DropdownButton
        id="dropdown-basic-button"
        title={value || 'select token'}
      >
        {items.map((item, i) => (
          <Dropdown.Item
          key={i}
          onClick={()=>{
            setValue(item.toNumber())
          }}
          >{item.toNumber()}</Dropdown.Item>
        ))}
      </DropdownButton>
        <Button variant="outline-secondary" onClick={()=>{
          onSubmit(value.toString())
        }}>{action}</Button>
    </InputGroup>
  )
}

export default DropdownInputForm
