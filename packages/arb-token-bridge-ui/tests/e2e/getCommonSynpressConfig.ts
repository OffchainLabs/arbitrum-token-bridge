export function getCommonSynpressConfig(shouldRecordVideo: boolean) {
  return {
    userAgent: 'synpress',
    retries: shouldRecordVideo ? 0 : 2,
    screenshotsFolder: 'cypress/screenshots',
    videosFolder: 'cypress/videos',
    video: shouldRecordVideo,
    screenshotOnRunFailure: true,
    chromeWebSecurity: true,
    modifyObstructiveCode: false,
    scrollBehavior: false,
    viewportWidth: 1366,
    viewportHeight: 850,
    env: {
      coverage: false
    },
    defaultCommandTimeout: 60000,
    pageLoadTimeout: 60000,
    requestTimeout: 60000,
    experimentalModifyObstructiveThirdPartyCode: true,
    experimentalInteractiveRunEvents: true,
    experimentalMemoryManagement: true
  } as const satisfies Cypress.ConfigOptions
}
