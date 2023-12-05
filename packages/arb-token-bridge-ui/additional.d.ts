declare module '*.svg' {
  import Image from 'next/image'
  const content: Image['src']
  export default content
}

declare module '*.png'
declare module '*.webp'
