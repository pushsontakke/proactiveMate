
const nextConfig = {
  /* config options here */
  reactCompiler: true,
  output: 'export',
  images: { unoptimized: true}, //required for static export
  trailingSlash: true,
};

export default nextConfig;
