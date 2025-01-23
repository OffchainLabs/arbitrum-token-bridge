import 'cross-fetch/polyfill'
import { TextDecoder, TextEncoder } from 'util'

global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

jest.setTimeout(25000)
