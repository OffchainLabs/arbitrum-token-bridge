import { useState, ImgHTMLAttributes } from 'react'

export type SafeImageProps = ImgHTMLAttributes<HTMLImageElement> & {
  fallback?: JSX.Element
}

export function SafeImage(props: SafeImageProps) {
  const { fallback = null, src, ...imgProps } = props
  const [validImageSrc, setValidImageSrc] = useState<boolean>(true)

  // useEffect(() => {
  //   const image = new Image()

  //   if (typeof src === 'undefined') {
  //     setValidImageSrc(null)
  //   } else if (typeof src === 'string') {
  //     const sanitizedImageSrc = sanitizeImageSrc(src)

  //     image.onerror = () => setValidImageSrc(null)
  //     image.onload = () => setValidImageSrc(sanitizedImageSrc)
  //     image.src = sanitizedImageSrc
  //   }

  //   return function cleanup() {
  //     // Abort previous loading
  //     image.src = ''
  //   }
  // }, [src])

  if (!validImageSrc || !src) {
    return fallback
  }

  return (
    // SafeImage is used for token logo, we don't know at buildtime where those images will be loaded from
    // It would throw error if it's loaded from external domains
    // eslint-disable-next-line @next/next/no-img-element
    <img
      {...imgProps}
      src={src}
      alt={props.alt || ''}
      onError={() => setValidImageSrc(false)}
    />
  )
}
