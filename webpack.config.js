const path = require("path");

module.exports = (env) => {
  return {
    entry: "./src/index.ts", // Replace with your entry file
    target: env.target === "web" ? "web" : "node", // Default to 'node' if not specified
    mode: "development", // 'production' or 'development'
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
      filename: `acl.${env.target}.js`,
      path: path.resolve(__dirname, "dist"),
      libraryTarget: env.target === "node" ? "commonjs2" : "umd",
      globalObject: env.target === "node" ? "this" : "window",
    },
    // ... other configurations ...
  };
};
