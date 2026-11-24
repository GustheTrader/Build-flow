
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`;
const scale = (name, steps) => Object.fromEntries(steps.map((n) => [n, v(`${name}-${n}`)]));
const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];
/** @type {import('tailwindcss').Config} */
module.exports = {
	darkMode: ['class'],
	content: [
		'./pages/**/*.{ts,tsx}',
		'./components/**/*.{ts,tsx}',
		'./app/**/*.{ts,tsx}',
		'./src/**/*.{ts,tsx}',
	],
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px',
			},
		},
		colors: {
			transparent: 'transparent',
			current: 'currentColor',
			black: '#000',
			white: '#fff',
			// The Whitis theme: every page's gray/blue/status classes follow these variables (src/index.css), light and dark.
			gray: scale('gray', STEPS),
			blue: scale('brand', STEPS),
			indigo: scale('brand', STEPS),
			green: scale('green', STEPS),
			red: scale('red', STEPS),
			amber: scale('amber', STEPS),
			yellow: scale('amber', STEPS),
			orange: scale('amber', STEPS),
			purple: scale('brand', STEPS),
		},
		fontFamily: {
			sans: ['Geist', 'ui-sans-serif', 'system-ui', 'sans-serif'],
			mono: ['"Geist Mono"', 'ui-monospace', 'monospace'],
			serif: ['"Instrument Serif"', 'Georgia', 'serif'],
		},
		extend: {
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: '#2B5D3A',
					foreground: 'hsl(var(--primary-foreground))',
				},
				secondary: {
					DEFAULT: '#4A90E2',
					foreground: 'hsl(var(--secondary-foreground))',
				},
				accent: {
					DEFAULT: '#F5A623',
					foreground: 'hsl(var(--accent-foreground))',
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))',
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))',
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))',
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))',
				},
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)',
			},
			keyframes: {
				'accordion-down': {
					from: { height: 0 },
					to: { height: 'var(--radix-accordion-content-height)' },
				},
				'accordion-up': {
					from: { height: 'var(--radix-accordion-content-height)' },
					to: { height: 0 },
				},
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
			},
		},
	},
	plugins: [require('tailwindcss-animate')],
}