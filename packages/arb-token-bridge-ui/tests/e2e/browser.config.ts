import { config as packageConfig } from '../../../../package.json'

export const browserConfig = {
  name: 'chrome',
  family: 'chromium',
  channel: 'stable',
  displayName: 'Chromium',
  version: packageConfig.chromeVersion,
  majorVersion: packageConfig.chromeVersion.split('.')[0],
  path:
    process.platform === 'darwin'
      ? `${process.cwd()}/${packageConfig.chromePath}/chrome/mac-arm/${
          packageConfig.chromeVersion
        }/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`
      : `${process.cwd()}/${packageConfig.chromePath}/chrome/linux-${
          packageConfig.chromeVersion
        }/chrome-linux64/chrome`
}
