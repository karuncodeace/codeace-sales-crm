/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  // Disable React Compiler to avoid requiring babel-plugin-react-compiler in this workspace.
  // Install babel-plugin-react-compiler and set reactCompiler: true if you want the React Compiler enabled.
  reactCompiler: false,
};

export default nextConfig;
