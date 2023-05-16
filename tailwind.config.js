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
        // ACTION
        error: '#CD0000',
        'blue-link': '#1366C1',

        // PRIMARY
        cyan: '#DDEAFA',
        brick: '#FFDDD6',
        orange: '#FFEED3',
        lime: '#E8FFE4',

        // SECONDARY
        'cyan-dark': '#11365E',
        'brick-dark': '#762716',
        'orange-dark': '#60461F',
        'lime-dark': '#31572A',

        // NEUTRAL (GRAYS)
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
        dark: '#1A1C1D',

        // BRAND
        'arb-one-primary': '#1B4ADD',
        'arb-one-dark': '#001A6B',
        'arb-nova-primary': '#E57310',
        'arb-nova-dark': '#743600',
        'eth-primary': '#454A75',
        'eth-dark': '#1A1C33',

        // legacy
        'blue-arbitrum': '#2D374B' // looks more like `eth-primary` but looks weird if we replace it
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
