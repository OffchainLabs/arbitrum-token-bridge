import { useState } from 'react'

const useCappedNumberInput = (
  defaultValue: number
): [number, (x: number, y: number) => void] => {
  const [value, setValue] = useState(defaultValue)
  const setValueCapped = (value: number, max: number) => {
    setValue(Math.min(value, max))
  }
  return [value, setValueCapped]
}
export default useCappedNumberInput
