// Mathopia brand mark: four coloured blocks + wordmark with a rainbow "opia".
export const BRAND = 'Mathopia';
export const TAGLINE = 'Play. Explore. Learn maths.';

export default function Logo({ size = 'sm' }) {
  return (
    <span className={`logo logo-${size}`} aria-label={BRAND}>
      <span className="logo-mark" aria-hidden="true"><i /><i /><i /><i /></span>
      <span className="logo-word" aria-hidden="true">
        Math<b>o</b><b>p</b><b>i</b><b>a</b>
      </span>
    </span>
  );
}
