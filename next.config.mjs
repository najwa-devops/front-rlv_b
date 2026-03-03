/** @type {import('next').NextConfig} */
const API_PROXY_TARGET = (process.env.API_PROXY_TARGET || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8096').replace(/\/$/, '')
const HAS_ABSOLUTE_PROXY_TARGET = /^https?:\/\//.test(API_PROXY_TARGET)

const nextConfig = {
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async rewrites() {
    if (!HAS_ABSOLUTE_PROXY_TARGET) return []
    return [
      {
        source: '/api/:path*',
        destination: `${API_PROXY_TARGET}/api/:path*`,
      },
    ]
  },
}

export default nextConfig
