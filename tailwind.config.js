/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      textShadow: {
        sm: '0 0 2px rgba(0, 191, 255, 0.3)',
        DEFAULT: '0 0 4px rgba(0, 191, 255, 0.4)',
        lg: '0 0 8px rgba(0, 191, 255, 0.5)',
        'yellow-sm': '0 0 2px rgba(255, 214, 0, 0.3)',
        'yellow': '0 0 4px rgba(255, 214, 0, 0.4)',
        'yellow-lg': '0 0 8px rgba(255, 214, 0, 0.5)',
      },
      typography: (theme) => ({
        DEFAULT: {
          css: {
            color: theme('colors.gray.300'),
            a: {
              color: theme('colors.cyan.400'),
              '&:hover': {
                color: theme('colors.cyan.300'),
              },
              textDecoration: 'none',
              borderBottom: `1px solid ${theme('colors.cyan.800')}`,
            },
            h1: {
              color: theme('colors.cyan.300'),
              fontFamily: "'Rajdhani', sans-serif",
            },
            h2: {
              color: theme('colors.cyan.300'),
              fontFamily: "'Rajdhani', sans-serif",
            },
            h3: {
              color: theme('colors.cyan.300'),
              fontFamily: "'Rajdhani', sans-serif",
            },
            h4: {
              color: theme('colors.cyan.300'),
              fontFamily: "'Rajdhani', sans-serif",
            },
            strong: {
              color: theme('colors.cyan.300'),
            },
            code: {
              color: theme('colors.green.300'),
              backgroundColor: 'rgba(0, 0, 0, 0.2)',
              fontFamily: "'Share Tech Mono', monospace",
              padding: '0.2em 0.4em',
              borderRadius: '0.25em',
              border: '1px solid rgba(0, 255, 0, 0.2)',
            },
            blockquote: {
              borderLeftColor: theme('colors.cyan.500'),
              backgroundColor: 'rgba(0, 0, 0, 0.2)',
              fontStyle: 'italic',
            },
            ul: {
              li: {
                '&::before': {
                  backgroundColor: theme('colors.cyan.500'),
                },
              },
            },
            ol: {
              li: {
                '&::before': {
                  color: theme('colors.cyan.400'),
                },
              },
            },
            hr: {
              borderColor: theme('colors.gray.700'),
            },
            'tbody tr': {
              borderBottomColor: theme('colors.gray.800'),
            },
            'thead th': {
              color: theme('colors.cyan.300'),
            },
          },
        },
        invert: {
          css: {
            color: theme('colors.gray.300'),
          },
        },
        cyan: {
          css: {
            '--tw-prose-links': theme('colors.cyan.400'),
            '--tw-prose-invert-links': theme('colors.cyan.400'),
          },
        },
        yellow: {
          css: {
            '--tw-prose-links': theme('colors.yellow.400'),
            '--tw-prose-invert-links': theme('colors.yellow.400'),
            h1: {
              color: theme('colors.yellow.300'),
            },
            h2: {
              color: theme('colors.yellow.300'),
            },
            h3: {
              color: theme('colors.yellow.300'),
            },
            h4: {
              color: theme('colors.yellow.300'),
            },
            strong: {
              color: theme('colors.yellow.300'),
            },
            blockquote: {
              borderLeftColor: theme('colors.yellow.500'),
            },
            'thead th': {
              color: theme('colors.yellow.300'),
            },
            'ul li::before': {
              backgroundColor: theme('colors.yellow.500'),
            },
            'ol li::before': {
              color: theme('colors.yellow.400'),
            },
          },
        },
      }),
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
    function ({ matchUtilities, theme }) {
      matchUtilities(
        {
          'text-shadow': (value) => ({
            textShadow: value,
          }),
        },
        { values: theme('textShadow') }
      );
    },
  ],
}
