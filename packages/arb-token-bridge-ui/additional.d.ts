declare module '*.svg' {
  import { ImageProps } from 'next/image'
  const content: ImageProps['src']
  export default content
}

// the following list is for ci yarn lint to pass
declare module '*.png' {
  import { ImageProps } from 'next/image'
  const content: ImageProps['src']
  export default content
}

declare module '*.webp' {
  import { ImageProps } from 'next/image'
  const content: ImageProps['src']
  export default content
}

declare module '*.json' {
  const value: any
  export default value
}
