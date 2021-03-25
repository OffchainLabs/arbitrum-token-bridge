import React from 'react'
import InputGroup from 'react-bootstrap/InputGroup'
import FormControl from 'react-bootstrap/FormControl'
import DropdownButton from 'react-bootstrap/DropdownButton'
import Dropdown from 'react-bootstrap/Dropdown'
import Button from 'react-bootstrap/Button'

import Form from 'react-bootstrap/Form'
import { BigNumber } from 'ethers'
import { useState, useMemo } from 'react'

type DropdownInputFormProps = {
  items: BigNumber[]
  text: string
  onSubmit: (s: string) => void
  disabled?: boolean
  action: string
}

const DropdownInputForm = ({
  items,
  text,
  onSubmit,
  action,
  disabled = false
}: DropdownInputFormProps) => {
  // TODO: 0 edge case?
  const [value, setValue] = useState<number | null>(null)
  const displayTitle = useMemo(() => {
    if (value !== null) {
      return value
    } else if (items.length > 0) {
      return 'select token'
    } else {
      return '(no tokens)'
    }
  }, [items, value])

  const disableActions = disabled || items.length === 0

  return (
    <InputGroup size="sm" className="mb-3">
      <InputGroup.Prepend>
        <InputGroup.Text id="inputGroup-sizing-sm">{text}</InputGroup.Text>
      </InputGroup.Prepend>
      <DropdownButton
        id="dropdown-basic-button"
        title={displayTitle}
        disabled={disableActions}
      >
        {items.map((item, i) => (
          <Dropdown.Item
            key={i}
            disabled={disabled}
            onClick={() => {
              setValue(item.toNumber())
            }}
          >
            {item.toNumber()}
          </Dropdown.Item>
        ))}
      </DropdownButton>
      <Button
        variant="outline-secondary"
        onClick={() => {
          if (value !== null){
            onSubmit(value.toString())
            setValue(null)
          }
        }}
        disabled={disableActions}
      >
        {action}
      </Button>
    </InputGroup>
  )
}

export default DropdownInputForm
