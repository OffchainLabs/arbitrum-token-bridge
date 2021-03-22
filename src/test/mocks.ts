import {  AssetType } from 'token-bridge-sdk'
import { BigNumber} from 'ethers'

export const mockPendingWithdrawals = {
    "123": {
      type: AssetType.ETH,
      value: BigNumber.from(2),
      destination: "0xasdfjalsdfj",
      uniqueId: BigNumber.from("123"),
      batchNumber: BigNumber.from("1"),
      indexInBatch: BigNumber.from("1"),
      arbBlockNum: BigNumber.from("1"),
      ethBlockNum:BigNumber.from("1"),
      timestamp: "1616370433493",
      callvalue: BigNumber.from("1"),
      data: "",
      caller: "0xasdfjalsdfj"

    }, 
    "223": {
      type: AssetType.ETH,
      value: BigNumber.from(2),
      destination: "0xasdfjalsdfj",
      uniqueId: BigNumber.from("223"),
      batchNumber: BigNumber.from("1"),
      indexInBatch: BigNumber.from("1"),
      arbBlockNum: BigNumber.from("1"),
      ethBlockNum:BigNumber.from("1"),
      timestamp: "1616370433493",
      callvalue: BigNumber.from("1"),
      data: "",
      caller: "0xasdfjalsdfj"

    }
  }