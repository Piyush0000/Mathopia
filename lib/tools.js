// Registry of tools shown in the nav bar and on the home page.
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
    slug: 'measurement', key: 'measurement', title: 'Measurement', short: 'Measurement', emoji: '📏', accent: 'var(--blue)',
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
