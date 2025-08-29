module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      // Add this plugin to handle import.meta
      ["@babel/plugin-syntax-import-meta"],
    ],
  };
};
