/** @type {import('next').NextConfig} */
const API_PROXY_TARGET = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8096'

const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${API_PROXY_TARGET}/api/:path*`,
      },
    ]
  },
}

export default nextConfig
