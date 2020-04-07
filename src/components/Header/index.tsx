import React, { useEffect, useState } from 'react'

interface Web3Data {
  ethAddress: string
  vmId: string
}
const Header = ({ ethAddress, vmId }: Web3Data) => {
  return (
    <div className="col-lg-12">
      <h1 className="text-center">Arbitrum Token Bridge</h1>
      <p>
        Your address: <span id="accountAddress">{ethAddress}</span>
      </p>
      <p>
        ArbChain address: <span id="rollupAddress">{vmId}</span>
      </p>
      <hr />
    </div>
  )
}

export default Header
