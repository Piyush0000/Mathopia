/** @type {import('next').NextConfig} */
const nextConfig = {
  // The game engines attach event listeners once per mount; strict mode's
  // double-mount in development would attach them twice.
  reactStrictMode: false,
};

export default nextConfig;
