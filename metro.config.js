let getDefaultConfig;
try {
  // Preferred import per Expo recommendation
  ({ getDefaultConfig } = require('@expo/metro-config'));
} catch (e) {
  // Fallback to legacy path (re-exported by expo)
  ({ getDefaultConfig } = require('expo/metro-config'));
}

const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: './global.css' });