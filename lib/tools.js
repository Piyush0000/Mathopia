// Registry of tools shown in the nav bar and on the home page.
// To add a game: create lib/games/<key>.js, add it here and in components/ToolPage.js.
export const TOOLS = [
  {
    slug: 'ten-frames', key: 'tenFrames', title: 'Ten Frames', short: 'Ten Frames', emoji: '🔟', accent: 'var(--red)',
    blurb: 'Build, flash and make numbers with counters.',
    modes: ['Explore (1 or 2 frames)', 'Flash & Say', 'Make Ten', 'Show Me!'],
  },
  {
    slug: 'place-value', key: 'placeValue', title: 'Place Value Workshop', short: 'Place Value', emoji: '🟧', accent: 'var(--orange)',
    blurb: 'Hundreds, tens & ones with build-and-break blocks.',
    modes: ['Workshop – break & bundle blocks', 'Build It', 'Count It', 'Trade It (regrouping)'],
  },
  {
    slug: 'number-line', key: 'hopper', title: 'Number Line Hopper', short: 'Hopper', emoji: '🐸', accent: '#3dbb6b', icon: '🐸🪷➕',
    blurb: 'Hop the frog along the number line to add and subtract.',
    modes: ['How many hops?', 'Where will I land?', 'Free hopping'],
  },
  {
    slug: 'pizza', key: 'pizza', title: 'Pizza Party Fractions', short: 'Pizza', emoji: '🍕', accent: '#e8553a', icon: '🍕🧑‍🍳😋',
    blurb: 'Cut pizzas and add toppings to fill fraction orders.',
    modes: ['Take orders (halves, quarters, thirds…)', 'Name the fraction', 'Bigger slice?'],
  },
  {
    slug: 'clock', key: 'clock', title: 'Clock Detective', short: 'Clocks', emoji: '🕵️', accent: 'var(--purple)', icon: '🕵️⏰📷',
    blurb: 'Set the clock to check the cameras and catch the culprit!',
    modes: ['Clock Detective cases', 'What time is it?', 'Play with the clock'],
  },
  {
    slug: 'shop', key: 'shop', title: 'Tuck Shop', short: 'Shop', emoji: '🪙', accent: '#e0b52c', icon: '🛒🪙🍭',
    blurb: 'Pay for treats, give change and count the money.',
    modes: ['Pay for it', 'Give change', 'Count the money'],
  },
  {
    slug: 'patterns', key: 'patterns', title: 'Pattern Caterpillar', short: 'Patterns', emoji: '🐛', accent: '#7ed957', icon: '🐛🍎🍌🦋',
    blurb: 'Feed the caterpillar the next piece of the pattern.',
    modes: ['Feed the caterpillar', 'Missing piece', 'Make a pattern'],
  },
  {
    slug: 'measurement', key: 'measurement', title: 'Measurement', short: 'Measure', emoji: '📏', accent: 'var(--blue)',
    blurb: 'Compare and measure with informal units.',
    modes: ['Length – line up & count cubes', 'Mass – balance scales', 'Capacity – pour cups', 'Area – cover with tiles'],
  },
  {
    slug: 'shapes', key: 'shapes', title: '2D Shapes & 3D Objects', short: 'Shapes', emoji: '🔷', accent: 'var(--green)',
    blurb: 'Name, describe, count and sort shapes.',
    modes: ['Explore & count sides, corners, faces, edges', 'Sorting game', 'Race to the Top (team game)'],
  },
];
export const toolBySlug = slug => TOOLS.find(t => t.slug === slug);
