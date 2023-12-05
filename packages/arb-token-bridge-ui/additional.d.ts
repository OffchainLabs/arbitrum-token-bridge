declare module '*.svg' {
  import Image from 'next/image'
  const content: Image['src']
  export default content
}

// the following list is for ci yarn lint to pass
// declare module '*.png'
// declare module '*.webp'
// declare module '*.json'
