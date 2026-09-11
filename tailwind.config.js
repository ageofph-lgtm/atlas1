/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
  	extend: {
  		borderRadius: {
  			lg: 'var(--rl)',
  			md: 'var(--rm)',
  			sm: 'var(--rp)',
  			DEFAULT: 'var(--rm)',
  			xl: 'var(--rl)',
  			'2xl': 'var(--rl)'
  		},
  		fontFamily: {
  			sans: ['var(--fui)', 'sans-serif'],
  			body: ['var(--fui)', 'sans-serif'],
  			heading: ['var(--fdis)', 'sans-serif'],
  			display: ['var(--fdis)', 'sans-serif'],
  			mono: ['var(--fnum)', 'monospace']
  		},
  		colors: {
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			},
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			},
  			/* ATLAS themed scales — RGB channels, opacity modifiers supported */
  			slate: {
  				100: 'rgb(var(--tx) / <alpha-value>)',
  				200: 'rgb(var(--tx) / <alpha-value>)',
  				300: 'rgb(var(--tx2) / <alpha-value>)',
  				400: 'rgb(var(--mu) / <alpha-value>)',
  				500: 'rgb(var(--mu2) / <alpha-value>)',
  				600: 'rgb(var(--bd-solid) / <alpha-value>)',
  				700: 'rgb(var(--surface2) / <alpha-value>)',
  				800: 'rgb(var(--surface) / <alpha-value>)',
  				900: 'rgb(var(--bg) / <alpha-value>)'
  			},
  			amber: {
  				300: 'rgb(var(--acc) / <alpha-value>)',
  				400: 'rgb(var(--acc) / <alpha-value>)',
  				500: 'rgb(var(--pribg) / <alpha-value>)',
  				600: 'rgb(var(--pribg) / <alpha-value>)'
  			},
  			ka: 'rgb(var(--ka) / <alpha-value>)',
  			kv: 'rgb(var(--kv) / <alpha-value>)',
  			kz: 'rgb(var(--kz) / <alpha-value>)',
  			kn: 'rgb(var(--kn) / <alpha-value>)',
  			caut: 'rgb(var(--c-aut) / <alpha-value>)',
  			cexe: 'rgb(var(--c-exe) / <alpha-value>)',
  			ccla: 'rgb(var(--c-cla) / <alpha-value>)',
  			cpro: 'rgb(var(--c-pro) / <alpha-value>)',
  			calu: 'rgb(var(--c-alu) / <alpha-value>)'
  		},
  		keyframes: {
  			'accordion-down': { from: { height: '0' }, to: { height: 'var(--radix-accordion-content-height)' } },
  			'accordion-up': { from: { height: 'var(--radix-accordion-content-height)' }, to: { height: '0' } }
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
}
