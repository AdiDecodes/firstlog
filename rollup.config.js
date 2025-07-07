import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "rollup-plugin-typescript2";
import terser from "@rollup/plugin-terser";

export default {
  input: "src/index.ts",
  output: [
    {
      file: "dist/index.cjs.js",
      format: "cjs",
      sourcemap: false,
      exports: "named",
    },
    {
      file: "dist/index.esm.js",
      format: "esm",
      sourcemap: false,
      exports: "named",
    },
  ],
  external: ["fs", "path", "nanoid", "geoip-lite"],
  plugins: [
    resolve(),
    commonjs(),
    typescript({
      tsconfig: "./tsconfig.json",
      useTsconfigDeclarationDir: true,
    }),
    terser({
      format: {
        comments: false,
      },
      compress: {
        passes: 2,
        unsafe: true,
        drop_console: true,
        drop_debugger: true,
      },
    }),
  ],
};
