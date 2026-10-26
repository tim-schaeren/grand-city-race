/** @type {import('tailwindcss').Config} */

// The colours the console uses come from variables in src/theme.css, which
// dark mode swaps; every other colour is Tailwind's own
const scale = name => Object.fromEntries(
  ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950']
    .map(step => [step, `rgb(var(--${name}-${step}) / <alpha-value>)`]),
);

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        white: 'rgb(var(--white) / <alpha-value>)',
        gray: scale('gray'),
        red: scale('red'),
        green: scale('green'),
        amber: scale('amber'),
        indigo: scale('indigo'),
        yellow: scale('yellow'),
      },
    },
  },
  plugins: [],
};
