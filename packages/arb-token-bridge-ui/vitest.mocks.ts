import { vi } from 'vitest'

vi.mock('next/font/local', () => ({
  default: vi.fn(() => ({
    style: {
      fontFamily: 'Roboto, sans-serif'
    }
  }))
}))
