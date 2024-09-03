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
    defaultCommandTimeout: 30000,
    pageLoadTimeout: 30000,
    requestTimeout: 30000
  } as const satisfies Cypress.ConfigOptions
}
