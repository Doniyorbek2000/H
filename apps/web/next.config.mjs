/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@smart/shared'],
  output: 'standalone',
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
