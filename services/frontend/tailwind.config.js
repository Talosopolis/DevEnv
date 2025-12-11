/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                serif: ['Playfair Display', 'serif'],
                mono: ['Fira Code', 'monospace'],
                display: ['Playfair Display', 'serif'], // Keep existing
                esoteric: ['"Space Grotesk"', 'sans-serif'], // Distinctive "Weird" Sans
            },
        },
    },
    plugins: [],
}
