import React from 'react'

import { BiLabel } from 'react-icons/bi'

interface LabelRendererProps {
  address: string
}
const LabelRenderer: React.FC<LabelRendererProps> = ({ address }) => {
  const label = '0xFFFFFFFFFFFFFFFF'
  return (
    <>
      <span className="inline-block align-middle mr-1 pb-1">
        {label && <BiLabel />}
      </span>
      <span>{label || address}</span>
    </>
  )
}

export { LabelRenderer }
