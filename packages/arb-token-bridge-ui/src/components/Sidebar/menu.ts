export type MenuItem = {
  title: string
  link: string
  description?: React.ReactNode
  className?: string
}

export const learnMenuItems: (MenuItem & { showOnHomepage?: boolean })[] = [
  {
    title: 'Bridge Tutorial',
    link: 'https://arbitrum.io/bridge-tutorial',
    description: 'How do I move funds from Ethereum to Arbitrum?',
    showOnHomepage: true
  },
  {
    title: 'About Arbitrum',
    link: 'https://docs.arbitrum.io/intro/',
    description: 'How does Arbitrum work?'
  },
  {
    title: 'Decentralization',
    link: 'https://docs.arbitrum.foundation/why-governance',
    description: 'Is Arbitrum decentralized?',
    showOnHomepage: true
  },

  {
    title: 'Orbit Chains',
    link: 'https://developer.arbitrum.io/launch-orbit-chain/orbit-gentle-introduction',
    description: 'What are Arbitrum Orbit chains?'
  },
  {
    title: 'One vs. Nova',
    link: 'https://developer.arbitrum.io/for-devs/concepts/public-chains',
    description:
      'What is the difference between Arbitrum One and Arbitrum Nova?',
    showOnHomepage: true
  },
  {
    title: 'About Stylus',
    link: 'https://docs.arbitrum.io/stylus/stylus-gentle-introduction',
    description: 'How does Stylus enable Rust-based smart contracts?'
  }
]

export const toolsMenuItems: MenuItem[] = [
  {
    title: 'Developer Docs',
    link: 'https://docs.arbitrum.io/for-devs/quickstart-solidity-hardhat',
    description: 'Start building an app on Arbitrum.'
  },

  {
    title: 'Orbit Deployer',
    link: 'https://orbit.arbitrum.io/',
    description: 'Deploy a customizable Orbit chain.'
  },
  {
    title: 'Arbitrum SDK',
    link: 'https://www.npmjs.com/package/@arbitrum/sdk',
    description: 'Interact with Arbitrum more easily.'
  },

  {
    title: 'Retryables',
    link: 'https://retryable-tx-panel.arbitrum.io/',
    description: 'Track Retryables and cross-chain messages.'
  },
  {
    title: 'Stylus Docs',
    link: 'https://docs.arbitrum.io/stylus/stylus-quickstart',
    description: 'Write a smart contract in Rust.'
  },
  {
    title: 'L2 Gas Savings',
    link: 'https://gas.arbitrum.io/',
    description: 'Estimate costs for Ethereum transactions on Arbitrum One.'
  },
  {
    title: 'Charts & Stats',
    link: 'https://dune.com/Henrystats/arbitrum-metrics',
    className: 'col-span-1',
    description: 'View real-time metrics of Arbitrum usage.'
  },
  {
    title: 'Status',
    link: 'https://status.arbitrum.io/',
    className: 'col-span-1',
    description: 'Check the status of Arbitrum network.'
  },
  {
    title: 'One Block Explorer',
    link: 'https://arbiscan.io/',
    description: 'Arbitrum One Block Explorer'
  },
  {
    title: 'Nova Block Explorer',
    link: 'https://nova.arbiscan.io/',
    description: 'Arbitrum Nova Block Explorer'
  },
  {
    title: 'Sepolia Block Explorer',
    link: 'https://sepolia.arbiscan.io/',
    description: 'Arbitrum Sepolia Block Explorer'
  },
  {
    title: 'Stylus Block Explorer',
    link: 'https://stylus-testnet-explorer.arbitrum.io/',
    description: 'Stylus Testnet Block Explorer'
  }
]

export const toolsMenuItemsDeveloperResources = toolsMenuItems.slice(
  0,
  toolsMenuItems.length - 7
)
export const toolsMenuItemsLiveMonitoring = toolsMenuItems.slice(
  toolsMenuItems.length - 7,
  toolsMenuItems.length - 5
)
export const toolsMenuItemsNetworkExplorers = toolsMenuItems.slice(
  toolsMenuItems.length - 5,
  toolsMenuItems.length
)

export const communityMenuItems: MenuItem[] = [
  {
    title: 'Arbitrum Website',
    link: 'https://arbitrum.io/'
  },
  {
    title: 'Twitter',
    link: 'https://twitter.com/arbitrum'
  },
  {
    title: 'Discord',
    link: 'https://discord.gg/arbitrum'
  },
  {
    title: 'Bug Bounties',
    link: 'https://immunefi.com/bounty/arbitrum/'
  },
  {
    title: 'Youtube',
    link: 'https://www.youtube.com/arbitrum'
  },
  {
    title: 'Medium',
    link: 'https://medium.com/offchainlabs'
  },
  {
    title: 'Arbitrum Foundation',
    link: 'https://arbitrum.foundation/'
  },
  { title: 'Governance Forum', link: 'https://forum.arbitrum.foundation/' },
  { title: 'Research Forum', link: 'https://research.arbitrum.io/' }
]
