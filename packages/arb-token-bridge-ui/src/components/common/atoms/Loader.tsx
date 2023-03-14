/*
    Standardized loading spinner atom
*/

import { TailSpin } from 'react-loader-spinner'
import { BaseProps } from 'react-loader-spinner/dist/type'

export type LoaderProps = BaseProps & {
  size: 'small' | 'medium' | 'large'
}

const getSizeByLoaderProps = (loaderSize: LoaderProps['size'] | undefined) => {
  switch (loaderSize) {
    case 'small':
      return 16

    case 'medium':
      return 32

    case 'large':
      return 44
  }
}

export const Loader = ({ size, color, ...rest }: LoaderProps) => {
  const sizeInPx = getSizeByLoaderProps(size)

  return <TailSpin height={sizeInPx} width={sizeInPx} color={color} {...rest} />
}
