export const oftV2Abi = [
  {
    type: 'error',
    name: 'InvalidLocalDecimals',
    inputs: []
  },
  {
    type: 'error',
    name: 'SlippageExceeded',
    inputs: [
      {
        name: 'amountLD',
        type: 'uint256'
      },
      {
        name: 'minAmountLD',
        type: 'uint256'
      }
    ]
  },
  {
    type: 'event',
    name: 'OFTSent',
    inputs: [
      {
        name: 'guid',
        type: 'bytes32',
        indexed: true
      },
      {
        name: 'dstEid',
        type: 'uint32',
        indexed: false
      },
      {
        name: 'fromAddress',
        type: 'address',
        indexed: true
      },
      {
        name: 'amountSentLD',
        type: 'uint256',
        indexed: false
      },
      {
        name: 'amountReceivedLD',
        type: 'uint256',
        indexed: false
      }
    ],
    anonymous: false
  },
  {
    type: 'event',
    name: 'OFTReceived',
    inputs: [
      {
        name: 'guid',
        type: 'bytes32',
        indexed: true
      },
      {
        name: 'srcEid',
        type: 'uint32',
        indexed: false
      },
      {
        name: 'toAddress',
        type: 'address',
        indexed: true
      },
      {
        name: 'amountReceivedLD',
        type: 'uint256',
        indexed: false
      }
    ],
    anonymous: false
  },
  {
    type: 'function',
    name: 'oftVersion',
    inputs: [],
    outputs: [
      {
        name: 'interfaceId',
        type: 'bytes4'
      },
      {
        name: 'version',
        type: 'uint64'
      }
    ],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'token',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'address'
      }
    ],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'approvalRequired',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'bool'
      }
    ],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'sharedDecimals',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'uint8'
      }
    ],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'quoteOFT',
    inputs: [
      {
        name: '_sendParam',
        type: 'tuple',
        components: [
          {
            name: 'dstEid',
            type: 'uint32'
          },
          {
            name: 'to',
            type: 'bytes32'
          },
          {
            name: 'amountLD',
            type: 'uint256'
          },
          {
            name: 'minAmountLD',
            type: 'uint256'
          },
          {
            name: 'extraOptions',
            type: 'bytes'
          },
          {
            name: 'composeMsg',
            type: 'bytes'
          },
          {
            name: 'oftCmd',
            type: 'bytes'
          }
        ]
      }
    ],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          {
            name: 'minAmountLD',
            type: 'uint256'
          },
          {
            name: 'maxAmountLD',
            type: 'uint256'
          }
        ]
      },
      {
        name: '',
        type: 'tuple[]',
        components: [
          {
            name: 'feeAmountLD',
            type: 'int256'
          },
          {
            name: 'description',
            type: 'string'
          }
        ]
      },
      {
        name: '',
        type: 'tuple',
        components: [
          {
            name: 'amountSentLD',
            type: 'uint256'
          },
          {
            name: 'amountReceivedLD',
            type: 'uint256'
          }
        ]
      }
    ],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'quoteSend',
    inputs: [
      {
        name: '_sendParam',
        type: 'tuple',
        components: [
          {
            name: 'dstEid',
            type: 'uint32'
          },
          {
            name: 'to',
            type: 'bytes32'
          },
          {
            name: 'amountLD',
            type: 'uint256'
          },
          {
            name: 'minAmountLD',
            type: 'uint256'
          },
          {
            name: 'extraOptions',
            type: 'bytes'
          },
          {
            name: 'composeMsg',
            type: 'bytes'
          },
          {
            name: 'oftCmd',
            type: 'bytes'
          }
        ]
      },
      {
        name: '_payInLzToken',
        type: 'bool'
      }
    ],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          {
            name: 'nativeFee',
            type: 'uint256'
          },
          {
            name: 'lzTokenFee',
            type: 'uint256'
          }
        ]
      }
    ],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'send',
    inputs: [
      {
        name: '_sendParam',
        type: 'tuple',
        components: [
          {
            name: 'dstEid',
            type: 'uint32'
          },
          {
            name: 'to',
            type: 'bytes32'
          },
          {
            name: 'amountLD',
            type: 'uint256'
          },
          {
            name: 'minAmountLD',
            type: 'uint256'
          },
          {
            name: 'extraOptions',
            type: 'bytes'
          },
          {
            name: 'composeMsg',
            type: 'bytes'
          },
          {
            name: 'oftCmd',
            type: 'bytes'
          }
        ]
      },
      {
        name: '_fee',
        type: 'tuple',
        components: [
          {
            name: 'nativeFee',
            type: 'uint256'
          },
          {
            name: 'lzTokenFee',
            type: 'uint256'
          }
        ]
      },
      {
        name: '_refundAddress',
        type: 'address'
      }
    ],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          {
            name: 'guid',
            type: 'bytes32'
          },
          {
            name: 'nonce',
            type: 'uint64'
          },
          {
            name: 'fee',
            type: 'tuple',
            components: [
              {
                name: 'nativeFee',
                type: 'uint256'
              },
              {
                name: 'lzTokenFee',
                type: 'uint256'
              }
            ]
          }
        ]
      },
      {
        name: '',
        type: 'tuple',
        components: [
          {
            name: 'amountSentLD',
            type: 'uint256'
          },
          {
            name: 'amountReceivedLD',
            type: 'uint256'
          }
        ]
      }
    ],
    stateMutability: 'payable'
  }
] as const
