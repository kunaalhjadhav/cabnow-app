import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef4ff',
          500: '#3b5bfd',
          600: '#2f47d6',
          700: '#28399f',
        },
      },
    },
  },
  plugins: [],
};
export default config;
