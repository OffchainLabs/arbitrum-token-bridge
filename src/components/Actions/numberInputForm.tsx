import React, { useCallback } from 'react'
import useCappedNumberInput from 'hooks/useCappedNumberInput'
import InputGroup from 'react-bootstrap/InputGroup'
import FormControl from 'react-bootstrap/FormControl'
import Button from 'react-bootstrap/Button'
import Tooltip from '@material-ui/core/Tooltip'
import ConfirmDialog, { useConfirmDialog } from './ConfirmDialog'
import Form from 'react-bootstrap/Form'

type NumberInputFormProps = {
  max: number
  text: string
  onSubmit: (s: string) => void
  disabled?: boolean
  buttonText?: string
  readOnlyValue?: number
  buttonHoverText?: string
  dialogText: string
}

const NumberInputForm = ({
  max,
  text,
  onSubmit,
  disabled = false,
  buttonText,
  readOnlyValue,
  buttonHoverText = '',
  dialogText
}: NumberInputFormProps) => {
  const [value, setValue] = useCappedNumberInput(
    readOnlyValue ? readOnlyValue : 0
  )

  const submit = useCallback(
    () => {      
      if(!(+value)){
        alert("You're trying to transfer 0 value; don't do that!")        
        return
      }
      onSubmit(value.toString())      
      setValue(0, max)
    },
    [value, onSubmit]
  )

  const {open, handleAccept, handleReject, handleClose, setDialogOpen} = useConfirmDialog(submit) 

  return (
    <InputGroup
      size="sm"
      className="mb-1"
      onChange={(e: any) => {
        setValue(e.target.value, max)
      }}
    >
      <ConfirmDialog dialogText={dialogText} open={open} handleAccept={handleAccept} handleReject={handleReject} handleClose ={handleClose} />
      <Form onSubmit={setDialogOpen}>
        <FormControl
          aria-label="Small"
          aria-describedby="inputGroup-sizing-sm"
          value={value || ''}
          type="number"
          step="0.01"
          disabled={disabled}
          placeholder={text}
          readOnly={typeof readOnlyValue === 'number'}
        />
      </Form>
      <Tooltip title={buttonHoverText}>
        <span>
          <Button disabled={disabled} type="submit" onClick={setDialogOpen}>
            {buttonText || 'submit'}
          </Button>
        </span>
      </Tooltip>
    </InputGroup>
  )
}

export default NumberInputForm
