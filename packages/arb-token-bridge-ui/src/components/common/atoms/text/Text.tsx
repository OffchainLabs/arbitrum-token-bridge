// typography

import { ReactNode } from 'react'

export type TextVariant =
  | 'heading-1'
  | 'heading-2'
  | 'heading-3'
  | 'subtitle-1'
  | 'subtitle-2'
  | 'body-1'
  | 'body-2'
  | 'small-btn'
  | 'big-btn'

export type TextProps = React.HTMLAttributes<HTMLSpanElement> & {
  variant?: TextVariant
  noWrap?: boolean
  error?: boolean
  children: ReactNode
}

const getClassNameFromVariant = (variant: TextVariant | undefined) => {
  switch (variant) {
    case 'heading-1':
      return 'text-[3.75rem] tracking-[.5%] font-bold'

    case 'heading-2':
      return 'text-[3rem] tracking-[.5%] font-bold'

    case 'heading-3':
      return 'text-[2.5rem] tracking-[.5%] font-medium'

    case 'subtitle-1':
      return 'text-[1.75rem] tracking-[.25%]'

    case 'subtitle-2':
      return 'text-[1.125rem] tracking-[.25%]'

    case 'body-2':
      return 'text-[0.75rem] tracking-[0%]'

    case 'small-btn':
      return 'text-[0.875rem] tracking-[0%]'

    case 'big-btn':
      return 'text-[1.5rem] tracking-[0.25%] font-medium'

    case 'body-1':
    default:
      return 'text-[1rem] tracking-[0%]'
  }
}

export const Text = (props: TextProps) => {
  const { children, variant, noWrap, error, ...rest } = props

  const className = `${getClassNameFromVariant(variant)} ${props.className} 
  ${noWrap ? 'whitespace-nowrap' : ''}
  ${error ? 'text-brick' : ''} `.trim()

  return (
    <span className={className} {...rest}>
      {children}
    </span>
  )
}

/*
TODO : Remove later - currently just to test the text components 
*/
export const TextAllVariants = ({ children }: { children: ReactNode }) => {
  const variants: TextVariant[] = [
    'heading-1',
    'heading-2',
    'heading-3',
    'subtitle-1',
    'subtitle-2',
    'body-1',
    'body-2',
    'small-btn',
    'big-btn'
  ]

  return (
    <div className="flex flex-col gap-2">
      {variants.map(variant => (
        <>
          <Text className="text-gray-9">{variant}</Text>
          <Text variant={variant}>{children}</Text>
        </>
      ))}
    </div>
  )
}
