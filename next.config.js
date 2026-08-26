/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Résolution des modules optionnels côté client
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        bufferutil: false,
        'utf-8-validate': false,
      };
    }

    // Masque les modules C++ optionnels de la librairie 'ws' utilisée par le SDK Gemini
    config.externals = [...(config.externals || []), 'bufferutil', 'utf-8-validate'];

    return config;
  },
};

module.exports = nextConfig;
