import type { NextConfig } from 'next'
import { PrismaPlugin } from '@prisma/nextjs-monorepo-workaround-plugin'

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    '/api/**/*': [
      './lib/generated/prisma/libquery_engine-rhel-openssl-3.0.x.so.node',
      './node_modules/@img/**/*'
    ]
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.plugins.push(new PrismaPlugin())
    }

    return config
  }
}

export default nextConfig