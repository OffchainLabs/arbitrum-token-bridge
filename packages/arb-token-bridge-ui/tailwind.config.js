module.exports = {
  purge: ['./src/**/*.{js,jsx,ts,tsx}', './public/index.html'],
  darkMode: false, // or 'media' or 'class'
  theme: {
    extend: {
      colors: {
        navy: '#2D374B',
        'bright-blue': '#28A0F0',
        'faded-blue': '#96BEDC',
        'dark-blue': '#2D49A7',
        grey: '#1F2937',
        gray1: '#333333',
        gray3: '#828282',
        gray6: '#F2F2F2',
        'main-bg': '#E5E5E5',
        tokenPill: '#EDF4FF',
        v3: {
          dark: '#1A1C1D',
          // Brick
          brick: '#FFDDD6',
          'brick-dark': '#762716',
          // Cyan
          cyan: '#DDEAFA',
          'cyan-dark': '#11365E',
          // Lime
          lime: '#E8FFE4',
          'lime-dark': '#31572A',
          // Orange
          orange: '#FFEED3',
          'orange-dark': '#60461F',
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
          // Networks
          'arbitrum-dark-blue': '#2D374B',
          'ethereum-dark-purple': '#454A75'
        }
      },
      fontFamily: {
        serif: "'Space Grotesk', sans-serif"
      },
      height: {
        'min-content': 'min-content'
      },
      minHeight: theme => {
        return {
          ...theme('spacing'),
          heading: '120px'
        }
      },
      maxHeight: {
        tokenList: '500px',
        transactionsList: '550px'
      },
      spacing: {
        networkBox: '590px',
        table: '969px',
        metamaskGif: '160px'
      },
      minWidth: theme => theme('spacing'),
      maxWidth: theme => {
        return { ...theme('spacing') }
      },
      boxShadow: {
        tooltip:
          '0px 0px 0px 1px rgba(0, 0, 0, 0.05), 0px 10px 15px -3px rgba(0, 0, 0, 0.1), 0px 4px 6px -2px rgba(0, 0, 0, 0.05)',
        networkBox:
          '0px 1px 3px rgba(0, 0, 0, 0.1), 0px 1px 2px rgba(0, 0, 0, 0.06)',
        networkButton:
          '0px 10px 15px -3px rgba(0, 0, 0, 0.1), 0px 4px 6px -2px rgba(0, 0, 0, 0.05)'
      },
      ringWidth: {
        DEFAULT: '1px'
      }
    }
  },
  variants: {
    extend: {
      display: ['group-hover'],
      backgroundColor: ['active'],
      boxShadow: ['active'],
      opacity: ['active'],
      margin: ['active']
    }
  },
  plugins: [
    // require('@tailwindcss/forms'),
  ],
  corePlugins: {
    outline: false,
    ringWidth: false,
    ringColor: false,
    ringOffsetWidth: false,
    ringOffsetColor: false
  }
}
