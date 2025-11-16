/** @type {import('next').NextConfig} */

const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  runtimeCaching: [
    // Cache static assets (images, fonts, CSS, JS)
    {
      urlPattern: /^https?.*\.(png|jpg|jpeg|svg|gif|webp|ico|woff|woff2|ttf|otf|eot)$/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'static-assets',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        },
      },
    },
    // Cache Next.js static files
    {
      urlPattern: /^\/_next\/static\/.*/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'next-static',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
        },
      },
    },
    // Cache app pages (HTML) - but always check network first
    {
      urlPattern: /^https?:\/\/erandwork\.com\/.*/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'pages',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 24 * 60 * 60, // 1 day
        },
        networkTimeoutSeconds: 10, // Fall back to cache if network takes > 10s
      },
    },
    // DO NOT cache API routes, Appwrite, Paystack, or any external APIs
    // These should always be fresh data from the network
  ],
})

const nextConfig = {
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Warning: This allows production builds to successfully complete even if
    // your project has type errors.
    ignoreBuildErrors: true,
  },
  // Clean configuration - notification system removed, using Resend for emails
}

module.exports = withPWA(nextConfig)