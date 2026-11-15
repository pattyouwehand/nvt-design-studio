import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    '/*': [
      './lib/generated/prisma/**/*',
      './node_modules/@img/**/*'
    ]
  }
}

export default nextConfig