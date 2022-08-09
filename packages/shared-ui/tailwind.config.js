module.exports = {
  purge: {
    content: ['./src/**/*.{js,jsx,ts,tsx}']
  },
  theme: {
    extend: {
      colors: {
        // Blue
        'blue-arbitrum': '#2D374B',
        'blue-link': '#1366C1',

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
        'purple-ethereum': '#454A75'
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
