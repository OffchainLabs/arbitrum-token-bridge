/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  plugins: [require('@headlessui/tailwindcss')],
  theme: {
    extend: {
      backgroundImage: {
        gradient:
          'linear-gradient(90deg, rgba(40, 160, 240, 0.5) 1.46%, rgba(239, 130, 32, 0.5) 98.51%)'
      },
      colors: {
        error: '#CD0000',
        // Blue
        'blue-arbitrum': '#2D374B',
        'blue-link': '#1366C1',
        'blue-arb-one': '#002086',

        // Brick
        brick: '#FFDDD6',
        'brick-dark': '#762716',

        // Cyan
        cyan: '#DDEAFA',
        'cyan-dark': '#11365E',

        // Dark
        dark: '#1A1C1D',

        // Gray
        'gray-1': '#FAFAFA',
        'gray-2': '#F4F4F4',
        'gray-3': '#EEEEEE',
        'gray-4': '#E6E6E6',
        'gray-5': '#DADADA',
        'gray-6': '#CCCCCC',
        'gray-7': '#BDBDBD',
        'gray-8': '#AEAEAE',
        'gray-9': '#999999',
        'gray-10': '#6D6D6D',
        'gray-11': '#212121',

        // Lime
        lime: '#E8FFE4',
        'lime-dark': '#31572A',

        // Orange
        orange: '#FFEED3',
        'orange-dark': '#60461F',

        // Purple
        'purple-ethereum': '#1A1C33',

        // Chain specific themes
        'orange-arbitrum-nova': '#EF8220',
        'blue-arbitrum-one': '#7EC6F6'
      },
      fontFamily: {
        serif: "'Space Grotesk', sans-serif"
      },
      maxWidth: {
        2: '0.5rem',
        4: '1rem',
        6: '1.5rem',
        8: '2rem'
      }
    }
  }
}
