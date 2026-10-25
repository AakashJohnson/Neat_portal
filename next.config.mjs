/** @type {import('next').NextConfig} */
const nextConfig = {
  // Isolated browser tests must not share the running developer server's lock/build.
  distDir: process.env.NEAT_DIST_DIR || '.next',
};

export default nextConfig;
