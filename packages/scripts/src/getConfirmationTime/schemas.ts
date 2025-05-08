export const ROLLUP_ABI = [
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "previousAdmin",
        type: "address",
      },
      {
        indexed: false,
        internalType: "address",
        name: "newAdmin",
        type: "address",
      },
    ],
    name: "AdminChanged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "beacon",
        type: "address",
      },
    ],
    name: "BeaconUpgraded",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint64",
        name: "nodeNum",
        type: "uint64",
      },
      {
        indexed: false,
        internalType: "bytes32",
        name: "blockHash",
        type: "bytes32",
      },
      {
        indexed: false,
        internalType: "bytes32",
        name: "sendRoot",
        type: "bytes32",
      },
    ],
    name: "NodeConfirmed",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint64",
        name: "nodeNum",
        type: "uint64",
      },
      {
        indexed: true,
        internalType: "bytes32",
        name: "parentNodeHash",
        type: "bytes32",
      },
      {
        indexed: true,
        internalType: "bytes32",
        name: "nodeHash",
        type: "bytes32",
      },
      {
        indexed: false,
        internalType: "bytes32",
        name: "executionHash",
        type: "bytes32",
      },
      {
        components: [
          {
            components: [
              {
                components: [
                  {
                    internalType: "bytes32[2]",
                    name: "bytes32Vals",
                    type: "bytes32[2]",
                  },
                  {
                    internalType: "uint64[2]",
                    name: "u64Vals",
                    type: "uint64[2]",
                  },
                ],
                internalType: "struct GlobalState",
                name: "globalState",
                type: "tuple",
              },
              {
                internalType: "enum MachineStatus",
                name: "machineStatus",
                type: "uint8",
              },
            ],
            internalType: "struct ExecutionState",
            name: "beforeState",
            type: "tuple",
          },
          {
            components: [
              {
                components: [
                  {
                    internalType: "bytes32[2]",
                    name: "bytes32Vals",
                    type: "bytes32[2]",
                  },
                  {
                    internalType: "uint64[2]",
                    name: "u64Vals",
                    type: "uint64[2]",
                  },
                ],
                internalType: "struct GlobalState",
                name: "globalState",
                type: "tuple",
              },
              {
                internalType: "enum MachineStatus",
                name: "machineStatus",
                type: "uint8",
              },
            ],
            internalType: "struct ExecutionState",
            name: "afterState",
            type: "tuple",
          },
          { internalType: "uint64", name: "numBlocks", type: "uint64" },
        ],
        indexed: false,
        internalType: "struct Assertion",
        name: "assertion",
        type: "tuple",
      },
      {
        indexed: false,
        internalType: "bytes32",
        name: "afterInboxBatchAcc",
        type: "bytes32",
      },
      {
        indexed: false,
        internalType: "bytes32",
        name: "wasmModuleRoot",
        type: "bytes32",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "inboxMaxCount",
        type: "uint256",
      },
    ],
    name: "NodeCreated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint64",
        name: "nodeNum",
        type: "uint64",
      },
    ],
    name: "NodeRejected",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "id", type: "uint256" },
    ],
    name: "OwnerFunctionCalled",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "account",
        type: "address",
      },
    ],
    name: "Paused",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint64",
        name: "challengeIndex",
        type: "uint64",
      },
      {
        indexed: false,
        internalType: "address",
        name: "asserter",
        type: "address",
      },
      {
        indexed: false,
        internalType: "address",
        name: "challenger",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint64",
        name: "challengedNode",
        type: "uint64",
      },
    ],
    name: "RollupChallengeStarted",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "bytes32",
        name: "machineHash",
        type: "bytes32",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "chainId",
        type: "uint256",
      },
    ],
    name: "RollupInitialized",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "account",
        type: "address",
      },
    ],
    name: "Unpaused",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "implementation",
        type: "address",
      },
    ],
    name: "Upgraded",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "implementation",
        type: "address",
      },
    ],
    name: "UpgradedSecondary",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "user", type: "address" },
      {
        indexed: false,
        internalType: "uint256",
        name: "initialBalance",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "finalBalance",
        type: "uint256",
      },
    ],
    name: "UserStakeUpdated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "user", type: "address" },
      {
        indexed: false,
        internalType: "uint256",
        name: "initialBalance",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "finalBalance",
        type: "uint256",
      },
    ],
    name: "UserWithdrawableFundsUpdated",
    type: "event",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "_stakerMap",
    outputs: [
      { internalType: "uint256", name: "amountStaked", type: "uint256" },
      { internalType: "uint64", name: "index", type: "uint64" },
      { internalType: "uint64", name: "latestStakedNode", type: "uint64" },
      { internalType: "uint64", name: "currentChallenge", type: "uint64" },
      { internalType: "bool", name: "isStaked", type: "bool" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "staker", type: "address" }],
    name: "amountStaked",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "baseStake",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "bridge",
    outputs: [{ internalType: "contract IBridge", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "chainId",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "challengeManager",
    outputs: [
      { internalType: "contract IChallengeManager", name: "", type: "address" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "confirmPeriodBlocks",
    outputs: [{ internalType: "uint64", name: "", type: "uint64" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          {
            components: [
              {
                components: [
                  {
                    internalType: "bytes32[2]",
                    name: "bytes32Vals",
                    type: "bytes32[2]",
                  },
                  {
                    internalType: "uint64[2]",
                    name: "u64Vals",
                    type: "uint64[2]",
                  },
                ],
                internalType: "struct GlobalState",
                name: "globalState",
                type: "tuple",
              },
              {
                internalType: "enum MachineStatus",
                name: "machineStatus",
                type: "uint8",
              },
            ],
            internalType: "struct ExecutionState",
            name: "beforeState",
            type: "tuple",
          },
          {
            components: [
              {
                components: [
                  {
                    internalType: "bytes32[2]",
                    name: "bytes32Vals",
                    type: "bytes32[2]",
                  },
                  {
                    internalType: "uint64[2]",
                    name: "u64Vals",
                    type: "uint64[2]",
                  },
                ],
                internalType: "struct GlobalState",
                name: "globalState",
                type: "tuple",
              },
              {
                internalType: "enum MachineStatus",
                name: "machineStatus",
                type: "uint8",
              },
            ],
            internalType: "struct ExecutionState",
            name: "afterState",
            type: "tuple",
          },
          { internalType: "uint64", name: "numBlocks", type: "uint64" },
        ],
        internalType: "struct Assertion",
        name: "assertion",
        type: "tuple",
      },
    ],
    name: "createNitroMigrationGenesis",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "staker", type: "address" }],
    name: "currentChallenge",
    outputs: [{ internalType: "uint64", name: "", type: "uint64" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "extraChallengeTimeBlocks",
    outputs: [{ internalType: "uint64", name: "", type: "uint64" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "firstUnresolvedNode",
    outputs: [{ internalType: "uint64", name: "", type: "uint64" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint64", name: "nodeNum", type: "uint64" },
      { internalType: "bytes32", name: "blockHash", type: "bytes32" },
      { internalType: "bytes32", name: "sendRoot", type: "bytes32" },
    ],
    name: "forceConfirmNode",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint64", name: "prevNode", type: "uint64" },
      {
        internalType: "uint256",
        name: "prevNodeInboxMaxCount",
        type: "uint256",
      },
      {
        components: [
          {
            components: [
              {
                components: [
                  {
                    internalType: "bytes32[2]",
                    name: "bytes32Vals",
                    type: "bytes32[2]",
                  },
                  {
                    internalType: "uint64[2]",
                    name: "u64Vals",
                    type: "uint64[2]",
                  },
                ],
                internalType: "struct GlobalState",
                name: "globalState",
                type: "tuple",
              },
              {
                internalType: "enum MachineStatus",
                name: "machineStatus",
                type: "uint8",
              },
            ],
            internalType: "struct ExecutionState",
            name: "beforeState",
            type: "tuple",
          },
          {
            components: [
              {
                components: [
                  {
                    internalType: "bytes32[2]",
                    name: "bytes32Vals",
                    type: "bytes32[2]",
                  },
                  {
                    internalType: "uint64[2]",
                    name: "u64Vals",
                    type: "uint64[2]",
                  },
                ],
                internalType: "struct GlobalState",
                name: "globalState",
                type: "tuple",
              },
              {
                internalType: "enum MachineStatus",
                name: "machineStatus",
                type: "uint8",
              },
            ],
            internalType: "struct ExecutionState",
            name: "afterState",
            type: "tuple",
          },
          { internalType: "uint64", name: "numBlocks", type: "uint64" },
        ],
        internalType: "struct Assertion",
        name: "assertion",
        type: "tuple",
      },
      { internalType: "bytes32", name: "expectedNodeHash", type: "bytes32" },
    ],
    name: "forceCreateNode",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address[]", name: "staker", type: "address[]" }],
    name: "forceRefundStaker",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address[]", name: "stakerA", type: "address[]" },
      { internalType: "address[]", name: "stakerB", type: "address[]" },
    ],
    name: "forceResolveChallenge",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint64", name: "nodeNum", type: "uint64" }],
    name: "getNode",
    outputs: [
      {
        components: [
          { internalType: "bytes32", name: "stateHash", type: "bytes32" },
          { internalType: "bytes32", name: "challengeHash", type: "bytes32" },
          { internalType: "bytes32", name: "confirmData", type: "bytes32" },
          { internalType: "uint64", name: "prevNum", type: "uint64" },
          { internalType: "uint64", name: "deadlineBlock", type: "uint64" },
          {
            internalType: "uint64",
            name: "noChildConfirmedBeforeBlock",
            type: "uint64",
          },
          { internalType: "uint64", name: "stakerCount", type: "uint64" },
          { internalType: "uint64", name: "childStakerCount", type: "uint64" },
          { internalType: "uint64", name: "firstChildBlock", type: "uint64" },
          { internalType: "uint64", name: "latestChildNumber", type: "uint64" },
          { internalType: "uint64", name: "createdAtBlock", type: "uint64" },
          { internalType: "bytes32", name: "nodeHash", type: "bytes32" },
        ],
        internalType: "struct Node",
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint64", name: "nodeNum", type: "uint64" }],
    name: "getNodeCreationBlockForLogLookup",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "staker", type: "address" }],
    name: "getStaker",
    outputs: [
      {
        components: [
          { internalType: "uint256", name: "amountStaked", type: "uint256" },
          { internalType: "uint64", name: "index", type: "uint64" },
          { internalType: "uint64", name: "latestStakedNode", type: "uint64" },
          { internalType: "uint64", name: "currentChallenge", type: "uint64" },
          { internalType: "bool", name: "isStaked", type: "bool" },
        ],
        internalType: "struct IRollupCore.Staker",
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint64", name: "stakerNum", type: "uint64" }],
    name: "getStakerAddress",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "inbox",
    outputs: [
      { internalType: "contract IInboxBase", name: "", type: "address" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: "uint64",
            name: "confirmPeriodBlocks",
            type: "uint64",
          },
          {
            internalType: "uint64",
            name: "extraChallengeTimeBlocks",
            type: "uint64",
          },
          { internalType: "address", name: "stakeToken", type: "address" },
          { internalType: "uint256", name: "baseStake", type: "uint256" },
          { internalType: "bytes32", name: "wasmModuleRoot", type: "bytes32" },
          { internalType: "address", name: "owner", type: "address" },
          {
            internalType: "address",
            name: "loserStakeEscrow",
            type: "address",
          },
          { internalType: "uint256", name: "chainId", type: "uint256" },
          { internalType: "string", name: "chainConfig", type: "string" },
          { internalType: "uint64", name: "genesisBlockNum", type: "uint64" },
          {
            components: [
              { internalType: "uint256", name: "delayBlocks", type: "uint256" },
              {
                internalType: "uint256",
                name: "futureBlocks",
                type: "uint256",
              },
              {
                internalType: "uint256",
                name: "delaySeconds",
                type: "uint256",
              },
              {
                internalType: "uint256",
                name: "futureSeconds",
                type: "uint256",
              },
            ],
            internalType: "struct ISequencerInbox.MaxTimeVariation",
            name: "sequencerInboxMaxTimeVariation",
            type: "tuple",
          },
        ],
        internalType: "struct Config",
        name: "config",
        type: "tuple",
      },
      {
        components: [
          { internalType: "contract IBridge", name: "bridge", type: "address" },
          {
            internalType: "contract ISequencerInbox",
            name: "sequencerInbox",
            type: "address",
          },
          {
            internalType: "contract IInboxBase",
            name: "inbox",
            type: "address",
          },
          { internalType: "contract IOutbox", name: "outbox", type: "address" },
          {
            internalType: "contract IRollupEventInbox",
            name: "rollupEventInbox",
            type: "address",
          },
          {
            internalType: "contract IChallengeManager",
            name: "challengeManager",
            type: "address",
          },
          {
            internalType: "address",
            name: "rollupAdminLogic",
            type: "address",
          },
          {
            internalType: "contract IRollupUser",
            name: "rollupUserLogic",
            type: "address",
          },
          { internalType: "address", name: "validatorUtils", type: "address" },
          {
            internalType: "address",
            name: "validatorWalletCreator",
            type: "address",
          },
        ],
        internalType: "struct ContractDependencies",
        name: "connectedContracts",
        type: "tuple",
      },
    ],
    name: "initialize",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "staker", type: "address" }],
    name: "isStaked",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "staker", type: "address" }],
    name: "isStakedOnLatestConfirmed",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "isValidator",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "staker", type: "address" }],
    name: "isZombie",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "lastStakeBlock",
    outputs: [{ internalType: "uint64", name: "", type: "uint64" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "latestConfirmed",
    outputs: [{ internalType: "uint64", name: "", type: "uint64" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "latestNodeCreated",
    outputs: [{ internalType: "uint64", name: "", type: "uint64" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "staker", type: "address" }],
    name: "latestStakedNode",
    outputs: [{ internalType: "uint64", name: "", type: "uint64" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "loserStakeEscrow",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "minimumAssertionPeriod",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint64", name: "nodeNum", type: "uint64" },
      { internalType: "address", name: "staker", type: "address" },
    ],
    name: "nodeHasStaker",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "outbox",
    outputs: [{ internalType: "contract IOutbox", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "pause",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "paused",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "proxiableUUID",
    outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "_outbox", type: "address" }],
    name: "removeOldOutbox",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "resume",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "rollupDeploymentBlock",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "rollupEventInbox",
    outputs: [
      { internalType: "contract IRollupEventInbox", name: "", type: "address" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "sequencerInbox",
    outputs: [
      { internalType: "contract ISequencerInbox", name: "", type: "address" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "newBaseStake", type: "uint256" },
    ],
    name: "setBaseStake",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint64", name: "newConfirmPeriod", type: "uint64" },
    ],
    name: "setConfirmPeriodBlocks",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "_inbox", type: "address" },
      { internalType: "bool", name: "_enabled", type: "bool" },
    ],
    name: "setDelayedInbox",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint64", name: "newExtraTimeBlocks", type: "uint64" },
    ],
    name: "setExtraChallengeTimeBlocks",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "contract IInboxBase",
        name: "newInbox",
        type: "address",
      },
    ],
    name: "setInbox",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "newLoserStakerEscrow",
        type: "address",
      },
    ],
    name: "setLoserStakeEscrow",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "newPeriod", type: "uint256" }],
    name: "setMinimumAssertionPeriod",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "contract IOutbox", name: "_outbox", type: "address" },
    ],
    name: "setOutbox",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "newOwner", type: "address" }],
    name: "setOwner",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "_sequencerInbox", type: "address" },
    ],
    name: "setSequencerInbox",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "newStakeToken", type: "address" },
    ],
    name: "setStakeToken",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address[]", name: "_validator", type: "address[]" },
      { internalType: "bool[]", name: "_val", type: "bool[]" },
    ],
    name: "setValidator",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bool",
        name: "_validatorWhitelistDisabled",
        type: "bool",
      },
    ],
    name: "setValidatorWhitelistDisabled",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "bytes32", name: "newWasmModuleRoot", type: "bytes32" },
    ],
    name: "setWasmModuleRoot",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "stakeToken",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "stakerCount",
    outputs: [{ internalType: "uint64", name: "", type: "uint64" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalWithdrawableFunds",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "beacon", type: "address" },
      { internalType: "address", name: "newImplementation", type: "address" },
    ],
    name: "upgradeBeacon",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "newImplementation", type: "address" },
    ],
    name: "upgradeSecondaryTo",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "newImplementation", type: "address" },
      { internalType: "bytes", name: "data", type: "bytes" },
    ],
    name: "upgradeSecondaryToAndCall",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "newImplementation", type: "address" },
    ],
    name: "upgradeTo",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "newImplementation", type: "address" },
      { internalType: "bytes", name: "data", type: "bytes" },
    ],
    name: "upgradeToAndCall",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [],
    name: "validatorUtils",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "validatorWalletCreator",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "validatorWhitelistDisabled",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "wasmModuleRoot",
    outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "user", type: "address" }],
    name: "withdrawableFunds",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "zombieNum", type: "uint256" }],
    name: "zombieAddress",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "zombieCount",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "zombieNum", type: "uint256" }],
    name: "zombieLatestStakedNode",
    outputs: [{ internalType: "uint64", name: "", type: "uint64" }],
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
