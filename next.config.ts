// next.config.js

import { redirect } from "next/dist/server/api-utils";

/** @type {import('next').NextConfig} */
const nextConfig = {
  redirect: async () => {
    return [
      {
        source: '/',
        destination: '/lobby',
        permanent: true,
      }
    ]
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
    ],
  },
};

module.exports = nextConfig;
