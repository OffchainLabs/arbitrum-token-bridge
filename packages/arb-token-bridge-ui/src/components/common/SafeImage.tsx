import { useState, useEffect, ImgHTMLAttributes } from 'react'

import { sanitizeImageSrc } from '../../util'

export type SafeImageProps = ImgHTMLAttributes<HTMLImageElement> & {
  fallback: JSX.Element
}

export function SafeImage(props: SafeImageProps) {
  const [validImageSrc, setValidImageSrc] = useState<false | string>(false)

  useEffect(() => {
    if (typeof props.src === 'undefined') {
      setValidImageSrc(false)
    } else {
      const sanitizedImageSrc = sanitizeImageSrc(props.src)

      const image = new Image()
      image.onerror = () => setValidImageSrc(false)
      image.onload = () => setValidImageSrc(sanitizedImageSrc)
      image.src = sanitizedImageSrc
    }
  }, [props.src])

  if (!validImageSrc) {
    return props.fallback
  }

  return <img {...props} src={validImageSrc} alt={props.alt || ''} />
}
