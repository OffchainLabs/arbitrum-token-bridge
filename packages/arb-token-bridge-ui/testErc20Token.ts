export const contractAbi = [
  {
    inputs: [
      {
        internalType: 'string',
        name: 'name',
        type: 'string'
      },
      {
        internalType: 'string',
        name: 'symbol',
        type: 'string'
      },
      {
        internalType: 'uint256',
        name: 'totalSupply',
        type: 'uint256'
      }
    ],
    stateMutability: 'payable',
    type: 'constructor'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'owner',
        type: 'address'
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'spender',
        type: 'address'
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'value',
        type: 'uint256'
      }
    ],
    name: 'Approval',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'from',
        type: 'address'
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'to',
        type: 'address'
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'value',
        type: 'uint256'
      }
    ],
    name: 'Transfer',
    type: 'event'
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'owner',
        type: 'address'
      },
      {
        internalType: 'address',
        name: 'spender',
        type: 'address'
      }
    ],
    name: 'allowance',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'spender',
        type: 'address'
      },
      {
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256'
      }
    ],
    name: 'approve',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool'
      }
    ],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'account',
        type: 'address'
      }
    ],
    name: 'balanceOf',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [
      {
        internalType: 'uint8',
        name: '',
        type: 'uint8'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'spender',
        type: 'address'
      },
      {
        internalType: 'uint256',
        name: 'subtractedValue',
        type: 'uint256'
      }
    ],
    name: 'decreaseAllowance',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool'
      }
    ],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'spender',
        type: 'address'
      },
      {
        internalType: 'uint256',
        name: 'addedValue',
        type: 'uint256'
      }
    ],
    name: 'increaseAllowance',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool'
      }
    ],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [],
    name: 'name',
    outputs: [
      {
        internalType: 'string',
        name: '',
        type: 'string'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'symbol',
    outputs: [
      {
        internalType: 'string',
        name: '',
        type: 'string'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'totalSupply',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'to',
        type: 'address'
      },
      {
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256'
      }
    ],
    name: 'transfer',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool'
      }
    ],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'from',
        type: 'address'
      },
      {
        internalType: 'address',
        name: 'to',
        type: 'address'
      },
      {
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256'
      }
    ],
    name: 'transferFrom',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool'
      }
    ],
    stateMutability: 'nonpayable',
    type: 'function'
  }
]

export const contractByteCode =
  '60806040526040516200193938038062001939833981810160405281019062000029919062000485565b8282816003908051906020019062000043929190620001fd565b5080600490805190602001906200005c929190620001fd565b5050506200007133826200007a60201b60201c565b505050620006c1565b600073ffffffffffffffffffffffffffffffffffffffff168273ffffffffffffffffffffffffffffffffffffffff161415620000ed576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401620000e49062000580565b60405180910390fd5b6200010160008383620001f360201b60201c565b8060026000828254620001159190620005d1565b92505081905550806000808473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060008282546200016c9190620005d1565b925050819055508173ffffffffffffffffffffffffffffffffffffffff16600073ffffffffffffffffffffffffffffffffffffffff167fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef83604051620001d391906200063f565b60405180910390a3620001ef60008383620001f860201b60201c565b5050565b505050565b505050565b8280546200020b906200068b565b90600052602060002090601f0160209004810192826200022f57600085556200027b565b82601f106200024a57805160ff19168380011785556200027b565b828001600101855582156200027b579182015b828111156200027a5782518255916020019190600101906200025d565b5b5090506200028a91906200028e565b5090565b5b80821115620002a95760008160009055506001016200028f565b5090565b6000604051905090565b600080fd5b600080fd5b600080fd5b600080fd5b6000601f19601f8301169050919050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052604160045260246000fd5b6200031682620002cb565b810181811067ffffffffffffffff82111715620003385762000337620002dc565b5b80604052505050565b60006200034d620002ad565b90506200035b82826200030b565b919050565b600067ffffffffffffffff8211156200037e576200037d620002dc565b5b6200038982620002cb565b9050602081019050919050565b60005b83811015620003b657808201518184015260208101905062000399565b83811115620003c6576000848401525b50505050565b6000620003e3620003dd8462000360565b62000341565b905082815260208101848484011115620004025762000401620002c6565b5b6200040f84828562000396565b509392505050565b600082601f8301126200042f576200042e620002c1565b5b815162000441848260208601620003cc565b91505092915050565b6000819050919050565b6200045f816200044a565b81146200046b57600080fd5b50565b6000815190506200047f8162000454565b92915050565b600080600060608486031215620004a157620004a0620002b7565b5b600084015167ffffffffffffffff811115620004c257620004c1620002bc565b5b620004d08682870162000417565b935050602084015167ffffffffffffffff811115620004f457620004f3620002bc565b5b620005028682870162000417565b925050604062000515868287016200046e565b9150509250925092565b600082825260208201905092915050565b7f45524332303a206d696e7420746f20746865207a65726f206164647265737300600082015250565b600062000568601f836200051f565b9150620005758262000530565b602082019050919050565b600060208201905081810360008301526200059b8162000559565b9050919050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052601160045260246000fd5b6000620005de826200044a565b9150620005eb836200044a565b9250827fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff03821115620006235762000622620005a2565b5b828201905092915050565b62000639816200044a565b82525050565b60006020820190506200065660008301846200062e565b92915050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052602260045260246000fd5b60006002820490506001821680620006a457607f821691505b60208210811415620006bb57620006ba6200065c565b5b50919050565b61126880620006d16000396000f3fe608060405234801561001057600080fd5b50600436106100a95760003560e01c80633950935111610071578063395093511461016857806370a082311461019857806395d89b41146101c8578063a457c2d7146101e6578063a9059cbb14610216578063dd62ed3e14610246576100a9565b806306fdde03146100ae578063095ea7b3146100cc57806318160ddd146100fc57806323b872dd1461011a578063313ce5671461014a575b600080fd5b6100b6610276565b6040516100c39190610b22565b60405180910390f35b6100e660048036038101906100e19190610bdd565b610308565b6040516100f39190610c38565b60405180910390f35b61010461032b565b6040516101119190610c62565b60405180910390f35b610134600480360381019061012f9190610c7d565b610335565b6040516101419190610c38565b60405180910390f35b610152610364565b60405161015f9190610cec565b60405180910390f35b610182600480360381019061017d9190610bdd565b61036d565b60405161018f9190610c38565b60405180910390f35b6101b260048036038101906101ad9190610d07565b6103a4565b6040516101bf9190610c62565b60405180910390f35b6101d06103ec565b6040516101dd9190610b22565b60405180910390f35b61020060048036038101906101fb9190610bdd565b61047e565b60405161020d9190610c38565b60405180910390f35b610230600480360381019061022b9190610bdd565b6104f5565b60405161023d9190610c38565b60405180910390f35b610260600480360381019061025b9190610d34565b610518565b60405161026d9190610c62565b60405180910390f35b60606003805461028590610da3565b80601f01602080910402602001604051908101604052809291908181526020018280546102b190610da3565b80156102fe5780601f106102d3576101008083540402835291602001916102fe565b820191906000526020600020905b8154815290600101906020018083116102e157829003601f168201915b5050505050905090565b60008061031361059f565b90506103208185856105a7565b600191505092915050565b6000600254905090565b60008061034061059f565b905061034d858285610772565b6103588585856107fe565b60019150509392505050565b60006012905090565b60008061037861059f565b905061039981858561038a8589610518565b6103949190610e04565b6105a7565b600191505092915050565b60008060008373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020549050919050565b6060600480546103fb90610da3565b80601f016020809104026020016040519081016040528092919081815260200182805461042790610da3565b80156104745780601f1061044957610100808354040283529160200191610474565b820191906000526020600020905b81548152906001019060200180831161045757829003601f168201915b5050505050905090565b60008061048961059f565b905060006104978286610518565b9050838110156104dc576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016104d390610ecc565b60405180910390fd5b6104e982868684036105a7565b60019250505092915050565b60008061050061059f565b905061050d8185856107fe565b600191505092915050565b6000600160008473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060008373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002054905092915050565b600033905090565b600073ffffffffffffffffffffffffffffffffffffffff168373ffffffffffffffffffffffffffffffffffffffff161415610617576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161060e90610f5e565b60405180910390fd5b600073ffffffffffffffffffffffffffffffffffffffff168273ffffffffffffffffffffffffffffffffffffffff161415610687576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161067e90610ff0565b60405180910390fd5b80600160008573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060008473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020819055508173ffffffffffffffffffffffffffffffffffffffff168373ffffffffffffffffffffffffffffffffffffffff167f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925836040516107659190610c62565b60405180910390a3505050565b600061077e8484610518565b90507fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff81146107f857818110156107ea576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016107e19061105c565b60405180910390fd5b6107f784848484036105a7565b5b50505050565b600073ffffffffffffffffffffffffffffffffffffffff168373ffffffffffffffffffffffffffffffffffffffff16141561086e576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610865906110ee565b60405180910390fd5b600073ffffffffffffffffffffffffffffffffffffffff168273ffffffffffffffffffffffffffffffffffffffff1614156108de576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016108d590611180565b60405180910390fd5b6108e9838383610a7f565b60008060008573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020016000205490508181101561096f576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161096690611212565b60405180910390fd5b8181036000808673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002081905550816000808573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020016000206000828254610a029190610e04565b925050819055508273ffffffffffffffffffffffffffffffffffffffff168473ffffffffffffffffffffffffffffffffffffffff167fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef84604051610a669190610c62565b60405180910390a3610a79848484610a84565b50505050565b505050565b505050565b600081519050919050565b600082825260208201905092915050565b60005b83811015610ac3578082015181840152602081019050610aa8565b83811115610ad2576000848401525b50505050565b6000601f19601f8301169050919050565b6000610af482610a89565b610afe8185610a94565b9350610b0e818560208601610aa5565b610b1781610ad8565b840191505092915050565b60006020820190508181036000830152610b3c8184610ae9565b905092915050565b600080fd5b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b6000610b7482610b49565b9050919050565b610b8481610b69565b8114610b8f57600080fd5b50565b600081359050610ba181610b7b565b92915050565b6000819050919050565b610bba81610ba7565b8114610bc557600080fd5b50565b600081359050610bd781610bb1565b92915050565b60008060408385031215610bf457610bf3610b44565b5b6000610c0285828601610b92565b9250506020610c1385828601610bc8565b9150509250929050565b60008115159050919050565b610c3281610c1d565b82525050565b6000602082019050610c4d6000830184610c29565b92915050565b610c5c81610ba7565b82525050565b6000602082019050610c776000830184610c53565b92915050565b600080600060608486031215610c9657610c95610b44565b5b6000610ca486828701610b92565b9350506020610cb586828701610b92565b9250506040610cc686828701610bc8565b9150509250925092565b600060ff82169050919050565b610ce681610cd0565b82525050565b6000602082019050610d016000830184610cdd565b92915050565b600060208284031215610d1d57610d1c610b44565b5b6000610d2b84828501610b92565b91505092915050565b60008060408385031215610d4b57610d4a610b44565b5b6000610d5985828601610b92565b9250506020610d6a85828601610b92565b9150509250929050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052602260045260246000fd5b60006002820490506001821680610dbb57607f821691505b60208210811415610dcf57610dce610d74565b5b50919050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052601160045260246000fd5b6000610e0f82610ba7565b9150610e1a83610ba7565b9250827fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff03821115610e4f57610e4e610dd5565b5b828201905092915050565b7f45524332303a2064656372656173656420616c6c6f77616e63652062656c6f7760008201527f207a65726f000000000000000000000000000000000000000000000000000000602082015250565b6000610eb6602583610a94565b9150610ec182610e5a565b604082019050919050565b60006020820190508181036000830152610ee581610ea9565b9050919050565b7f45524332303a20617070726f76652066726f6d20746865207a65726f2061646460008201527f7265737300000000000000000000000000000000000000000000000000000000602082015250565b6000610f48602483610a94565b9150610f5382610eec565b604082019050919050565b60006020820190508181036000830152610f7781610f3b565b9050919050565b7f45524332303a20617070726f766520746f20746865207a65726f20616464726560008201527f7373000000000000000000000000000000000000000000000000000000000000602082015250565b6000610fda602283610a94565b9150610fe582610f7e565b604082019050919050565b6000602082019050818103600083015261100981610fcd565b9050919050565b7f45524332303a20696e73756666696369656e7420616c6c6f77616e6365000000600082015250565b6000611046601d83610a94565b915061105182611010565b602082019050919050565b6000602082019050818103600083015261107581611039565b9050919050565b7f45524332303a207472616e736665722066726f6d20746865207a65726f20616460008201527f6472657373000000000000000000000000000000000000000000000000000000602082015250565b60006110d8602583610a94565b91506110e38261107c565b604082019050919050565b60006020820190508181036000830152611107816110cb565b9050919050565b7f45524332303a207472616e7366657220746f20746865207a65726f206164647260008201527f6573730000000000000000000000000000000000000000000000000000000000602082015250565b600061116a602383610a94565b91506111758261110e565b604082019050919050565b600060208201905081810360008301526111998161115d565b9050919050565b7f45524332303a207472616e7366657220616d6f756e742065786365656473206260008201527f616c616e63650000000000000000000000000000000000000000000000000000602082015250565b60006111fc602683610a94565b9150611207826111a0565b604082019050919050565b6000602082019050818103600083015261122b816111ef565b905091905056fea26469706673582212208c4de549eca959f0c80db3d9ce079bc7488992e22c4b5106960e063a6b9af93464736f6c634300080a0033'
