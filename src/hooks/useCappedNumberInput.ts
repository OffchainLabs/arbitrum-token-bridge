import { useState } from 'react'

export type CappedNumberInput = [number, (x: number, y: number) => void]

const useCappedNumberInput = (defaultValue: number): CappedNumberInput => {
  const [value, setValue] = useState(defaultValue)
  const setValueCapped = (newValue: number, max: number) => {
    setValue(newValue > max ? max : newValue)
  }

  return [value, setValueCapped]
}
export default useCappedNumberInput
