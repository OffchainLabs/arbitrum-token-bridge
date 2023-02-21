/*
    Standardised loading spinner atom
*/

import Spinner, { LoaderProps as SpinnerProps } from 'react-loader-spinner'

export type LoaderProps = SpinnerProps & {
  size?: 'small' | 'medium' | 'large'
}

const getSizeByLoaderProps = (loaderSize: LoaderProps['size'] | undefined) => {
  switch (loaderSize) {
    case 'small':
      return 16

    case 'medium':
    default:
      return 32

    case 'large':
      return 44
  }
}

export const Loader = (props: LoaderProps) => {
  const { type: loaderType, size, color, ...rest } = props

  const sizeInPx = getSizeByLoaderProps(size)

  return (
    <Spinner
      type="TailSpin" // we should only be using this 1 variant for consistency across product, unless explicitly specified
      height={sizeInPx}
      width={sizeInPx}
      color={color}
      {...rest}
    />
  )
}
