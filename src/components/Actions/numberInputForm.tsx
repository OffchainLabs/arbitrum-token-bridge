import React from 'react'
import useCappedNumberInput from 'hooks/useCappedNumberInput'
import InputGroup from 'react-bootstrap/InputGroup'
import FormControl from 'react-bootstrap/FormControl'
import Form from 'react-bootstrap/Form'

type NumberInputFormProps = {
  max: number
  text: string
  onSubmit: (s: string) => void
  disabled?: boolean
}

const NumberInputForm = ({
  max,
  text,
  onSubmit,
  disabled = false
}: NumberInputFormProps) => {
  const [value, setValue] = useCappedNumberInput(0)

  return (
    <InputGroup
      size="sm"
      className="mb-3"
      onChange={(e: any) => {
        setValue(e.target.value, max)
      }}
    >
      <InputGroup.Prepend>
        <InputGroup.Text id="inputGroup-sizing-sm">{text}</InputGroup.Text>
      </InputGroup.Prepend>
      <Form
        onSubmit={(e: any) => {
          e.preventDefault()
          onSubmit(value.toString())
        }}
      >
        <FormControl
          aria-label="Small"
          aria-describedby="inputGroup-sizing-sm"
          value={value || ""}
          type="number"
          step="0.01"
          disabled={disabled}
        />
      </Form>
    </InputGroup>
  )
}

export default NumberInputForm
