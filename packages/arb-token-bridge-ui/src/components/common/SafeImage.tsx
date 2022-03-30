import { useState, useEffect, ImgHTMLAttributes } from 'react'

export interface SafeImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  fallback: JSX.Element
}

export function SafeImage(props: SafeImageProps) {
  const [isValid, setIsValid] = useState(true)

  useEffect(() => {
    if (typeof props.src === 'undefined') {
      setIsValid(false)
    } else {
      const image = new Image()
      image.onerror = () => setIsValid(false)
      image.src = props.src
    }
  }, [props.src])

  return isValid ? <img {...props} alt={props.alt || ''} /> : props.fallback
}
