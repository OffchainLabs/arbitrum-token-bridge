import { useState } from 'react'

import { Modal } from '../common/Modal'

const TokenModal = (): JSX.Element => {
  const [isOpen, setIsOpen] = useState(false)
  return (
    <Modal
      isOpen={isOpen}
      setIsOpen={setIsOpen}
      buttonText="Copy"
      title="Choose token"
    >
      <div>test</div>
    </Modal>
  )
}

export { TokenModal }
