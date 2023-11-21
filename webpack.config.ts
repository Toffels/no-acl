import path from "path";
import { Configuration } from "webpack";
import CopyPlugin from "copy-webpack-plugin";

module.exports = (env: any) => {
  return {
    entry: "./src/index.ts", // Replace with your entry file
    target: env.target === "web" ? "web" : "node", // Default to 'node' if not specified
    mode: "production", // 'production' or 'development'
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: "ts-loader",
          exclude: /node_modules/,
        },
      ],
    },
    resolve: {
      extensions: [".tsx", ".ts", ".js"],
    },
    output: {
      filename: `index.${env.target}.js`,
      path: path.resolve(__dirname, "dist"),
      libraryTarget: env.target === "node" ? "commonjs2" : "umd",
      globalObject: env.target === "node" ? "this" : "window",
    },
    externals: {
      zod: "zod",
    },
    plugins: [
      // Add this plugin to copy package.json
      new CopyPlugin({
        patterns: [
          { from: "package-pub.json", to: "package.json" },
          { from: "README.md", to: "README.md" },
          { from: "TODO.md", to: "TODO.md" },
          { from: "LICENSE.md", to: "LICENSE.md" },
          { from: "CHANGELOG.md", to: "CHANGELOG.md" },
        ],
      }),
    ],
  };
};
