const { getDefaultConfig } = require("expo/metro-config");
const config = getDefaultConfig(__dirname);

config.resolver.platforms = ["ios", "android", "native", "web"];

config.transformer.minifierConfig = {
  keep_fnames: true,
  mangle: {
    keep_fnames: true,
  },
};

// Add resolver config for better module handling
config.resolver.sourceExts = [...config.resolver.sourceExts, 'mjs'];

module.exports = config;
