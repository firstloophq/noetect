/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#ffffff',
      },
    },
  },
  plugins: [],
  // For dev mode - include ALL Tailwind classes
  safelist: [
    // Include all color variants
    { pattern: /^bg-.*/ },
    { pattern: /^text-.*/ },
    { pattern: /^border-.*/ },
    { pattern: /^ring-.*/ },
    { pattern: /^shadow-.*/ },
    { pattern: /^opacity-.*/ },
    { pattern: /^scale-.*/ },
    { pattern: /^rotate-.*/ },
    { pattern: /^translate-.*/ },
    { pattern: /^skew-.*/ },
    { pattern: /^space-.*/ },
    { pattern: /^gap-.*/ },
    { pattern: /^p[xytblr]?-.*/ },
    { pattern: /^m[xytblr]?-.*/ },
    { pattern: /^w-.*/ },
    { pattern: /^h-.*/ },
    { pattern: /^min-.*/ },
    { pattern: /^max-.*/ },
    { pattern: /^flex-.*/ },
    { pattern: /^grid-.*/ },
    { pattern: /^justify-.*/ },
    { pattern: /^items-.*/ },
    { pattern: /^self-.*/ },
    { pattern: /^place-.*/ },
    { pattern: /^rounded-.*/ },
    { pattern: /^font-.*/ },
    { pattern: /^text-.*/ },
    { pattern: /^leading-.*/ },
    { pattern: /^tracking-.*/ },
    { pattern: /^transition-.*/ },
    { pattern: /^duration-.*/ },
    { pattern: /^ease-.*/ },
    { pattern: /^delay-.*/ },
    { pattern: /^animate-.*/ },
    // Include all variants
    { pattern: /.*/, variants: ['hover', 'focus', 'active', 'disabled', 'dark', 'sm', 'md', 'lg', 'xl', '2xl', 'group-hover', 'group-focus', 'first', 'last', 'odd', 'even', 'visited', 'checked', 'focus-within', 'focus-visible'] },
  ]
}