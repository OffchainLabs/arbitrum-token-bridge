import React, { useContext } from 'react'

import { ConnectionState } from 'util/index'

const ModeContext = React.createContext(ConnectionState.DEPOSIT_MODE)
export const useIsDepositMode = () => {
  return useContext(ModeContext) === ConnectionState.DEPOSIT_MODE
}

export default ModeContext
