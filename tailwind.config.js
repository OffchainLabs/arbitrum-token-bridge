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
        'main-bg': '#E5E5E5'
      },
      fontFamily: {
        serif: "'Inter', sans-serif"
      },
      height: {
        'min-content': 'min-content'
      },
      minHeight: {
        heading: '230px'
      },
      spacing: {
        networkBox: '540px',
        table: '969px'
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
      }
    }
  },
  variants: {
    extend: {
      display: ['group-hover']
    }
  },
  plugins: [
    // require('@tailwindcss/forms'),
  ]
}
