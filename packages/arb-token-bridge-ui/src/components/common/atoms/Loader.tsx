import { TailSpin } from 'react-loader-spinner'
import { BaseProps } from 'react-loader-spinner/dist/type'

export type LoaderProps = BaseProps & {
  size: 'small' | 'medium' | 'large' | number
}

const getSizeByLoaderProps = (
  loaderSize: LoaderProps['size'] | number | undefined
) => {
  if (typeof loaderSize === 'number') {
    return loaderSize
  }

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
