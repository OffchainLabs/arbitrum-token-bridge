import { ImgHTMLAttributes } from 'react'

import { sanitizeImageSrc } from '../../util'
import useSWR from 'swr'

export type SafeImageProps = ImgHTMLAttributes<HTMLImageElement> & {
  fallback?: JSX.Element
}

export function SafeImage(props: SafeImageProps) {
  const { fallback = null, src, ...imgProps } = props

  const { data: validImageSrc, error } = useSWR(src, _src => {
    return new Promise<string>((resolve, reject) => {
      const image = new Image()

      if (typeof src === 'undefined') {
        resolve('')
      } else {
        const sanitizedImageSrc = sanitizeImageSrc(_src)

        image.onerror = () => {
          reject()
        }
        image.onload = () => {
          resolve(sanitizedImageSrc)
        }
        image.src = sanitizedImageSrc
      }
    })
  })

  if (!validImageSrc || error) {
    return fallback
  }

  // SafeImage is used for token logo, we don't know at buildtime where those images will be loaded from
  // It would throw error if it's loaded from external domains
  // eslint-disable-next-line @next/next/no-img-element
  return <img {...imgProps} src={validImageSrc} alt={props.alt || ''} />
}
