import React, { useCallback } from 'react'
import useCappedNumberInput from 'hooks/useCappedNumberInput'
import InputGroup from 'react-bootstrap/InputGroup'
import FormControl from 'react-bootstrap/FormControl'
import Button from 'react-bootstrap/Button'

import Form from 'react-bootstrap/Form'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'

type NumberInputFormProps = {
  max: number
  text: string
  onSubmit: (s: string) => void
  disabled?: boolean
  buttonText?: string
  readOnlyValue?: number
}

const NumberInputForm = ({
  max,
  text,
  onSubmit,
  disabled = false,
  buttonText,
  readOnlyValue
}: NumberInputFormProps) => {
  const [value, setValue] = useCappedNumberInput(
    readOnlyValue ? readOnlyValue : 0
  )

  const submit = useCallback(
    (e: any) => {
      e.preventDefault()
      onSubmit(value.toString())
      setValue(0, max)
    },
    [value, onSubmit]
  )

  return (
    <InputGroup
      size="sm"
      className="mb-1"
      onChange={(e: any) => {
        setValue(e.target.value, max)
      }}
    >
        <Row>
        <Col> <span >{text}  </span>

        <Button disabled={disabled} type="submit" onClick={submit}>
        {buttonText || 'submit'}
      </Button>
      </Col>
        </Row>

    </InputGroup>
  )
}

export default NumberInputForm
