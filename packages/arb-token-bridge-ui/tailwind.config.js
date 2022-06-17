module.exports = {
  purge: ['./src/**/*.{js,jsx,ts,tsx}', './public/index.html'],
  theme: {
    extend: {
      colors: {
        navy: '#2D374B',
        'bright-blue': '#28A0F0',
        'faded-blue': '#96BEDC',
        'dark-blue': '#2D49A7',

        // TODO:
        //
        // Get rid of the above colors and remove the `v3` prefix from the colors below.
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
          // Blue
          'blue-link': '#1366C1',
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
      }
    }
  },
  variants: {
    extend: {
      display: ['group-hover'],
      textColor: ['disabled'],
      backgroundColor: ['active', 'disabled'],
      boxShadow: ['active'],
      opacity: ['active', 'disabled'],
      margin: ['active'],
      ringWidth: ['focus-visible'],
      ringColor: ['focus-visible'],
      borderWidth: ['disabled']
    }
  }
}
