import { useState, useEffect, ImgHTMLAttributes } from 'react'

import { sanitizeImageSrc } from '../../util'

export type SafeImageProps = ImgHTMLAttributes<HTMLImageElement> & {
  fallback?: JSX.Element
}

export function SafeImage(props: SafeImageProps) {
  const { fallback = null, src, ...imgProps } = props
  const [validImageSrc, setValidImageSrc] = useState<false | string>(false)

  useEffect(() => {
    let isMounted = true
    const image = new Image()

    if (typeof src === 'undefined') {
      setValidImageSrc(false)
    } else {
      const sanitizedImageSrc = sanitizeImageSrc(src)

      if (isMounted) {
        image.onerror = () => setValidImageSrc(false)
        image.onload = () => setValidImageSrc(sanitizedImageSrc)
        image.src = sanitizedImageSrc
      }
    }

    return () => {
      isMounted = false
    }
  }, [src])

  if (!validImageSrc) {
    return fallback
  }

  return <img {...imgProps} src={validImageSrc} alt={props.alt || ''} />
}
