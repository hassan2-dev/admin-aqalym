import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  // Keep firebase-admin (and jose/jwks-rsa) outside the Next bundle — avoids ERR_REQUIRE_ESM on Vercel.
  serverExternalPackages: ['firebase-admin', 'jose', 'jwks-rsa'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com' },
      { protocol: 'https', hostname: 'pub-b8f549a404d044c7bd91cf20eb766f47.r2.dev' },
    ],
  },
};

export default nextConfig;
