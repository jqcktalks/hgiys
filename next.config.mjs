/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Station pages are fully static; no server data fetching at request time.
  experimental: {},
};

export default nextConfig;
