import { join, resolve } from 'path'

import { config as packageConfig } from '../../../../package.json'

const getBrowserPath = () => {
  const workspaceRoot = resolve(process.cwd(), '../..')

  const chromePath =
    process.platform === 'darwin'
      ? join(
          workspaceRoot,
          packageConfig.chromePath,
          'chrome',
          `mac_arm-${packageConfig.chromeVersion}`,
          'chrome-mac-arm64',
          'Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
        )
      : join(
          workspaceRoot,
          packageConfig.chromePath,
          'chrome/linux-' + packageConfig.chromeVersion,
          'chrome-linux64/chrome'
        )

  return chromePath
}

export const browserConfig = {
  name: 'chrome',
  family: 'chromium',
  channel: 'stable',
  displayName: 'Chromium',
  version: packageConfig.chromeVersion,
  majorVersion: packageConfig.chromeVersion.split('.')[0],
  path: getBrowserPath()
}
