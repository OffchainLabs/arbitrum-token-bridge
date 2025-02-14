import { join, resolve } from 'path'
import packageConfig from '../../../../package.json'

const getBrowserPath = () => {
  const workspaceRoot = resolve(process.cwd(), '../..')

  const chromePath =
    process.platform === 'darwin'
      ? join(
          workspaceRoot,
          packageConfig.config.chromePath,
          'chrome',
          `mac_arm-${packageConfig.config.chromeVersion}`,
          'chrome-mac-arm64',
          'Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
        )
      : join(
          workspaceRoot,
          packageConfig.config.chromePath,
          'chrome/linux-' + packageConfig.config.chromeVersion,
          'chrome-linux64/chrome'
        )

  return chromePath
}

export const browserConfig = {
  name: 'chrome',
  channel: 'stable',
  family: 'chromium',
  displayName: 'Chrome',
  version: packageConfig.config.chromeVersion,
  majorVersion: packageConfig.config.chromeVersion.split('.')[0],
  path: getBrowserPath(),
  isHeaded: true,
  isHeadless: false
}
