/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    '../../node_modules/@offchainlabs/cobalt/**/*.{js,ts,jsx,tsx}'
  ],
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  plugins: [require('@headlessui/tailwindcss')],
  theme: {
    extend: {
      backgroundImage: {
        gradient:
          'linear-gradient(90deg, rgba(40, 160, 240, 0.5) 1.46%, rgba(239, 130, 32, 0.5) 98.51%)',
        gradientCctp: 'linear-gradient(95deg, #77E8CB 0%, #A199F7 100%)',
        gradientCelebration: 'linear-gradient(to right, #1B4ADD6F, #E573106F)',
        highlight:
          'linear-gradient(to right, rgba(255, 255, 255, 0), rgba(255, 255, 255, 0.1) 25%, rgba(255, 255, 255, 0.1) 75%, rgba(255, 255, 255, 0))'
      },
      colors: {
        // ACTION
        error: '#CD0000',
        'blue-link': '#1366C1',

        // PRIMARY
        cyan: '#DDEAFA',
        brick: '#ff9f8b',
        orange: '#FFEED3',
        lime: '#E8FFE4',
        lilac: '#754562',
        blue: '#00FBFF',

        // SECONDARY
        'cyan-dark': '#11365E',
        'brick-dark': '#762716',
        'orange-dark': '#60461F',
        'lime-dark': '#31572A',

        // TRANSACTION STATUS COLORS
        claim: '#6AD28A',
        retry: '#CD0000',
        pending: '#CCB069',

        // NEUTRAL (GRAYS)
        'gray-1': '#191919',
        'gray-2': '#E5E5E5',
        'gray-3': '#DADADA',
        'gray-4': '#CCCCCC',
        'gray-5': '#AEAEAE',
        'gray-6': '#999999',
        'gray-7': '#BDBDBD',
        'gray-8': '#262626',
        'gray-dark': '#6D6D6D',
        'line-gray': '#F4F4F4',
        dark: '#1A1C1D', // (or default-black)
        'dark-hover': '#2b2e30', // (or default-black-hover)

        'bg-gray-1': '#191919',

        // BRAND
        'eth-dark': '#1A1C33',
        'ocl-blue': '#243145',
        'atmosphere-blue': '#152C4E',
        'widget-background': 'var(--color-widget-background, #191919)',
        'primary-cta': 'var(--color-primary-cta, #31572A)'
      },
      spacing: {
        1: '5px',
        2: '10px',
        3: '15px',
        4: '20px',
        5: '25px',
        6: '30px',
        7: '35px',
        8: '40px',
        9: '45px',
        10: '50px',
        12: '60px',
        14: '70px',
        16: '80px',
        18: '90px',
        19: '95px',
        20: '100px',
        22: '110px',
        24: '120px',
        26: '130px',
        28: '140px',
        30: '150px',
        32: '160px',
        34: '170px',
        36: '180px',
        40: '200px',
        42: '210px',
        44: '220px',
        50: '250px',
        60: '300px',
        64: '320px',
        78: '380px',
        80: '400px'
      },
      fontFamily: {
        unica77: ['var(--font-unica77)'],
        theme: ['var(--font-family, var(--font-unica77), Roboto, sans-serif)']
      },
      fontSize: {
        xl: '1.375rem'
      },
      lineHeight: {
        'extra-tight': '1.15'
      },
      maxWidth: {
        2: '0.5rem',
        4: '1rem',
        6: '1.5rem',
        8: '2rem'
      },
      borderRadius: {
        DEFAULT: 'var(--border-radius, 10px)',
        sm: 'calc(var(--border-radius, 10px) / 2)'
      },
      borderWidth: {
        DEFAULT: 'var(--border-width, 1px)'
      },
      boxShadow: {
        // shadow used for input fields across the app
        input:
          '0px 2px 2px rgba(33,37,41,0.06), 0px 0px 1px rgba(33,37,41,0.08)',
        2: '0px 0px 1px 0px rgba(33, 37, 41, 0.08), 0px 2px 2px 0px rgba(33, 37, 41, 0.06)'
      },
      keyframes: {
        'blink-pulse': {
          '0%, 100%': {
            opacity: 1
          },
          '50%': {
            opacity: 0.5
          }
        }
      },
      animation: {
        blink: 'blink-pulse 1s ease-in-out 1',
        blinkInfinite: 'blink-pulse 1s ease-in-out infinite'
      },
      transitionDuration: {
        400: '400ms',
        1000: '1000ms'
      }
    }
  }
}
