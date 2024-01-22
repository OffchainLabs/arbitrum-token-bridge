/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  plugins: [require('@headlessui/tailwindcss')],
  theme: {
    extend: {
      backgroundImage: {
        gradient:
          'linear-gradient(90deg, rgba(40, 160, 240, 0.5) 1.46%, rgba(239, 130, 32, 0.5) 98.51%)',
        gradientCctp: 'linear-gradient(95deg, #77E8CB 0%, #A199F7 100%)'
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
        'gray-1': '#F4F4F4',
        'gray-2': '#E5E5E5',
        'gray-3': '#DADADA',
        'gray-4': '#CCCCCC',
        'gray-5': '#AEAEAE',
        'gray-header-menu': '#8d8e8e',
        'gray-6': '#999999',
        'gray-dark': '#6D6D6D',
        dark: '#1A1C1D', // (or default-black)

        // BRAND
        'eth-dark': '#1A1C33',
        'ocl-blue': '#243145'
      },
      fontFamily: {
        serif: "'Space Grotesk', sans-serif"
      },
      maxWidth: {
        2: '0.5rem',
        4: '1rem',
        6: '1.5rem',
        8: '2rem'
      },
      boxShadow: {
        // shadow used for input fields across the app
        input:
          '0px 2px 2px rgba(33,37,41,0.06), 0px 0px 1px rgba(33,37,41,0.08)'
      }
    }
  }
}
