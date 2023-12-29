declare module '*.svg' {
  import Image from 'next/image'
  const content: Image['src']
  export default content
}

// the following list is for ci yarn lint to pass
declare module '*.png' {
  import Image from 'next/image'
  const content: Image['src']
  export default content
}

declare module '*.webp' {
  import Image from 'next/image'
  const content: Image['src']
  export default content
}

declare module '*.json' {
  const value: any
  export default value
}
