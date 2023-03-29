import { useState, useEffect, ImgHTMLAttributes } from 'react'

import { sanitizeImageSrc } from '../../util'

export type SafeImageProps = ImgHTMLAttributes<HTMLImageElement> & {
  fallback?: JSX.Element
}

export function SafeImage(props: SafeImageProps) {
  const { fallback = null, src, ...imgProps } = props
  const [validImageSrc, setValidImageSrc] = useState<false | string>(false)

  useEffect(() => {
    const image = new Image()

    if (typeof src === 'undefined') {
      setValidImageSrc(false)
    } else {
      const sanitizedImageSrc = sanitizeImageSrc(src)

      image.onerror = () => setValidImageSrc(false)
      image.onload = () => setValidImageSrc(sanitizedImageSrc)
      image.src = sanitizedImageSrc
    }

    return function cleanup() {
      // Abort previous loading
      image.src = ''
    }
  }, [src])

  if (!validImageSrc) {
    return fallback
  }

  // SafeImage is used for token logo, we don't know at buildtime where those images will be loaded from
  // It would throw error if it's loaded from external domains
  // eslint-disable-next-line @next/next/no-img-element
  return <img {...imgProps} src={validImageSrc} alt={props.alt || ''} />
}
