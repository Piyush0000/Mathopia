// Lets phones "Add to Home Screen" and open Mathopia full-screen like an app.
export default function manifest() {
  return {
    name: 'Mathopia',
    short_name: 'Mathopia',
    description: 'Play. Explore. Learn maths.',
    start_url: '/',
    display: 'standalone',
    orientation: 'any',
    background_color: '#fff8ec',
    theme_color: '#073b4c',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
  };
}
