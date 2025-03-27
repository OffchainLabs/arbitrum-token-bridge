declare module '@synthetixio/synpress' {
  export function defineWalletSetup(password: string, setup: Function): any
}

declare module '@synthetixio/synpress/cypress' {
  export function configureSynpressForMetaMask(
    on: any,
    config: any,
    customMetamask?: boolean
  ): any
}

declare module '@synthetixio/synpress/cypress/support' {
  export function synpressCommandsForMetaMask(): void
}

declare module '@synthetixio/synpress/playwright' {
  export function getExtensionId(
    context: any,
    extensionName: string
  ): Promise<string>
  export class MetaMask {
    constructor(context: any, page: any, password: string, extensionId: string)
    importWallet(seedPhraseOrPrivateKey: string): Promise<void>
    addNetwork(networkConfig: any): Promise<void>
    switchNetwork(networkName: string): Promise<void>
    connectToDapp(): Promise<void>
    approvePermissionToSpend(spendLimit?: string): Promise<void>
    confirmTransaction(options?: any): Promise<void>
    rejectTransaction(): Promise<void>
    lock(): Promise<void>
    unlock(password?: string): Promise<void>
  }
}

// Define Cypress commands
declare namespace Cypress {
  interface Chainable {
    /**
     * Add network to MetaMask
     */
    addNetwork(networkConfig: any): Chainable<void>

    /**
     * Switch to network by name
     */
    switchNetwork(networkName: string): Chainable<void>

    /**
     * Connect MetaMask to dApp
     */
    connectToDapp(): Chainable<void>

    /**
     * Confirm transaction in MetaMask
     */
    confirmTransaction(options?: any): Chainable<void>

    /**
     * Reject transaction in MetaMask
     */
    rejectTransaction(): Chainable<void>

    /**
     * Import wallet to MetaMask
     */
    importWallet(seedPhraseOrPrivateKey: string): Chainable<void>

    /**
     * Get current account address
     */
    getAccount(): Chainable<string>
  }
}
