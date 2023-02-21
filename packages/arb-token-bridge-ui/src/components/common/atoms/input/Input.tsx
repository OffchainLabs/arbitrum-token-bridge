export type InputShape = 'box' | 'pill'
export type InputSize = 'medium' | 'large'

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  inputSize?: InputSize
  inputShape?: InputShape
  leftComponent?: React.ReactNode
  rightComponent?: React.ReactNode
  loading?: boolean
  error?: boolean
  errorMessage?: string | React.ReactNode
  inputClassName?: string
}

const getClassNameFromProps = (props: InputProps) => {
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

export const Input = (props: InputProps) => {
  const {
    // custom attributes
    inputSize,
    inputShape,
    className,
    inputClassName,
    leftComponent,
    rightComponent,
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
        {leftComponent ?? null}

        {/* Actual input element */}
        <input
          className={`h-full w-full bg-transparent px-3 font-light placeholder:text-gray-9 ${
            inputClassName ?? ''
          }`}
          {...rest}
        />

        {/* Optional component to append to the input */}
        {rightComponent ?? null}
      </div>

      {/* Show error message */}
      {typeof errorMessage !== 'undefined' && (
        <span className="text-sm text-brick">{errorMessage}</span>
      )}
    </>
  )
}
