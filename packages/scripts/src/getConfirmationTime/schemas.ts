export const ROLLUP_ABI = [
  {
    inputs: [],
    name: "latestNodeCreated",
    outputs: [{ internalType: "uint64", name: "", type: "uint64" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint64", name: "nodeNum", type: "uint64" }],
    name: "getNode",
    outputs: [
      {
        components: [
          { internalType: "uint64", name: "prevNum", type: "uint64" },
          { internalType: "uint64", name: "deadlineBlock", type: "uint64" },
          {
            internalType: "uint64",
            name: "noChildConfirmedBeforeBlock",
            type: "uint64",
          },
          { internalType: "uint64", name: "stakerCount", type: "uint64" },
          {
            internalType: "uint64",
            name: "childProposedBlocks",
            type: "uint64",
          },
          { internalType: "uint64", name: "firstChildBlock", type: "uint64" },
          { internalType: "uint64", name: "latestChildNumber", type: "uint64" },
          { internalType: "uint64", name: "createdAtBlock", type: "uint64" },
          { internalType: "bytes32", name: "confirmData", type: "bytes32" },
          { internalType: "bytes32", name: "prevHash", type: "bytes32" },
          { internalType: "bytes32", name: "nodeHash", type: "bytes32" },
          { internalType: "bytes32", name: "inboxMaxCount", type: "bytes32" },
        ],
        internalType: "struct Node",
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
];

export interface ParentChainInfo {
  rpcUrl: string;
  blockExplorer: string;
  chainId: number;
  name: string;
}

export interface ConfirmationTimeSummary {
  chainId: number;
  chainName: string;
  parentChainId: number;
  averageNodeCreationTime: bigint;
  estimatedConfirmationTime: number;
  usedFallback: boolean;
}
