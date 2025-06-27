/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all files that contain Nativewind classes.
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './node_modules/@rnr/**/*.{ts,tsx}',
  ], 
  presets: [require("nativewind/preset")],
  darkMode: 'media', // Use system preference
  theme: {
    extend: {
      fontSize: {
        base: "0.95rem",
      },
      colors: {
        background: "rgb(255 255 255)", // --background: 0 0% 100%
        foreground: "rgb(10 10 10)", // --foreground: 0 0% 3.9%
        card: {
          DEFAULT: "rgb(255 255 255)", // --card: 0 0% 100%
          foreground: "rgb(10 10 10)", // --card-foreground: 0 0% 3.9%
        },
        popover: {
          DEFAULT: "rgb(255 255 255)", // --popover: 0 0% 100%
          foreground: "rgb(10 10 10)", // --popover-foreground: 0 0% 3.9%
        },
        primary: {
          DEFAULT: "rgb(23 23 23)", // --primary: 0 0% 9%
          foreground: "rgb(250 250 250)", // --primary-foreground: 0 0% 98%
        },
        secondary: {
          DEFAULT: "rgb(245 245 245)", // --secondary: 0 0% 96.1%
          foreground: "rgb(23 23 23)", // --secondary-foreground: 0 0% 9%
        },
        muted: {
          DEFAULT: "rgb(245 245 245)", // --muted: 0 0% 96.1%
          foreground: "rgb(115 115 115)", // --muted-foreground: 0 0% 45.1%
        },
        accent: {
          DEFAULT: "rgb(245 245 245)", // --accent: 0 0% 96.1%
          foreground: "rgb(23 23 23)", // --accent-foreground: 0 0% 9%
        },
        destructive: {
          DEFAULT: "rgb(239 68 68)", // --destructive: 0 84.2% 60.2%
          foreground: "rgb(250 250 250)", // --destructive-foreground: 0 0% 98%
        },
        border: "rgb(229 229 229)", // --border: 0 0% 89.8%
        input: "rgb(229 229 229)", // --input: 0 0% 89.8%
        ring: "rgb(10 10 10)", // --ring: 0 0% 3.9%
        // Changed purple references to blue
        blue: {
          50: "rgb(239 246 255)",
          100: "rgb(219 234 254)",
          200: "rgb(191 219 254)",
          300: "rgb(147 197 253)",
          400: "rgb(96 165 250)",
          500: "rgb(59 130 246)",
          600: "rgb(37 99 235)",
          700: "rgb(29 78 216)",
          800: "rgb(30 64 175)",
          900: "rgb(30 58 138)",
        },
      },
      borderRadius: {
        lg: "1rem", // --radius: 1rem
        md: "calc(1rem - 2px)",
        sm: "calc(1rem - 4px)",
      },
    },
  },
  plugins: [],
}
