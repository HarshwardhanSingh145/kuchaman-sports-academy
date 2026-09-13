import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  // Allow access to remote image placeholder.
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**', // This allows any path under the hostname
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  transpilePackages: ['motion'],
  webpack: (config, {dev}) => {
    // HMR is disabled in AI Studio via DISABLE_HMR env var.
    // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
    if (dev && process.env.DISABLE_HMR === 'true') {
      config.watchOptions = {
        ignored: /.*/,
      };
    }
    return config;
  },
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/',
          destination: '/index.html',
        },
        { source: '/assets/video/facility-vid-1.mp4', destination: '/gallery/VID-20260911-WA0066.mp4' },
        { source: '/assets/video/facility-vid-2.mp4', destination: '/gallery/VID-20260911-WA0096.mp4' },
        { source: '/assets/video/facility-vid-3.mp4', destination: '/gallery/VID-20260911-WA0097-1.mp4' },
        { source: '/assets/video/facility-vid-4.mp4', destination: '/gallery/VID-20260911-WA0106.mp4' },
        { source: '/assets/video/facility-vid-5.mp4', destination: '/gallery/VID-20260911-WA0110.mp4' },
        { source: '/assets/video/facility-vid-6.mp4', destination: '/gallery/VID-20260912-WA0007.mp4' },
        { source: '/assets/video/facility-vid-7.mp4', destination: '/gallery/VID-20260912-WA0013.mp4' },
        { source: '/assets/video/facility-vid-8.mp4', destination: '/gallery/VID-20260912-WA0019.mp4' },
        { source: '/assets/video/facility-vid-9.mp4', destination: '/gallery/VID-20260912-WA0022.mp4' },
        { source: '/assets/video/facility-vid-10.mp4', destination: '/gallery/VID-20260912-WA0025.mp4' },
        { source: '/assets/video/facility-vid-11.mp4', destination: '/gallery/VID-20260912-WA0026.mp4' },
        { source: '/assets/video/facility-vid-12.mp4', destination: '/gallery/VID-20260912-WA0027.mp4' },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
