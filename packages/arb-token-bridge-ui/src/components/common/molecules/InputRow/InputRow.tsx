/*
    A composable row of [Left child]-[Input field]-[Right Component] used extensively in our project
    eg. Token selection dropdown + amount input
    eg. Input field with search/other icons prepended or buttons (like MAX) embedded
    eg. Inputs with error message
*/

import { InputProps, Input } from '../../atoms/input/Input'
import { Text } from '../../atoms/text/Text'

export type InputShape = 'box' | 'pill'
export type InputSize = 'medium' | 'large'

export type InputRowProps = InputProps & {
  inputSize?: InputSize
  inputShape?: InputShape
  leftChildren?: React.ReactNode
  rightChildren?: React.ReactNode
  loading?: boolean
  error?: boolean
  errorMessage?: string | React.ReactNode
  inputClassName?: string
}

const getClassNameFromProps = (props: InputRowProps) => {
  let className = `font-light placeholder:text-gray-9 rounded-md border border-gray-4 bg-white w-full`

  if (props.disabled) {
    className = `${className} !bg-gray-5`
  }

  if (props.inputSize === 'large') {
    className = `${className} text-xl sm:text-3xl rounded-lg h-16`
  } else {
    className = `${className} text-sm rounded-md h-10`
  }

  if (props.inputShape === 'pill') {
    // if pill, then add a rounded border, else it's a box
    className = `${className} !rounded-full`
  }

  if (props.error || props.errorMessage) {
    // might be some case where we want to only highlight error but don't wanna show error message
    // error can be controlled by boolean `error` or `error message`
    className = `${className} border-[#cd0000]`
  }

  return className
}

export const InputRow = (props: InputRowProps) => {
  const {
    // custom attributes
    inputSize,
    inputShape,
    className,
    inputClassName,
    leftChildren,
    rightChildren,
    error,
    errorMessage,
    // rest of the HTML intrinsic attributes
    ...rest
  } = props

  const completeClassName = `${getClassNameFromProps(props)} ${className ?? ''}`

  return (
    <>
      <div
        className={`flex flex-row flex-nowrap items-center ${completeClassName}`}
      >
        {/* Optional component to prepend before input */}
        {leftChildren ?? null}

        {/* Actual input element */}
        <Input className={`px-3 ${inputClassName ?? ''}`} {...rest} />

        {/* Optional component to append to the input */}
        {rightChildren ?? null}
      </div>

      {/* Show error message */}
      {typeof errorMessage !== 'undefined' && (
        <Text variant="body-2" error>
          {errorMessage}
        </Text>
      )}
    </>
  )
}
