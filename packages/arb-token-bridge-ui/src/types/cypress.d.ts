declare module 'cypress' {
  interface ConfigOptions {
    e2e: {
      setupNodeEvents: (
        on: Cypress.PluginEvents,
        config: Cypress.PluginConfigOptions
      ) => Promise<Cypress.PluginConfigOptions>
      baseUrl: string
      specPattern: string[]
      supportFile: string
      browsers: any[]
      defaultCommandTimeout: number
    }
  }

  export function defineConfig(config: Partial<ConfigOptions>): ConfigOptions
}

declare module '@synthetixio/synpress/plugins' {
  export default function synpressPlugins(
    on: Cypress.PluginEvents,
    config: Cypress.PluginConfigOptions
  ): void
}

declare module 'cypress-terminal-report/src/installLogsPrinter' {
  export default function logsPrinter(on: Cypress.PluginEvents): void
}

declare namespace Cypress {
  interface PluginEvents {
    (action: string, callback: (...args: any[]) => any): void
  }

  interface PluginConfigOptions {
    env: Record<string, any>
    [key: string]: any
  }
}
