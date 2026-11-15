import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    '/api/**/*': [
      './lib/generated/prisma/libquery_engine-rhel-openssl-3.0.x.so.node',
      './node_modules/@img/**/*'
    ]
  }
}

export default nextConfig