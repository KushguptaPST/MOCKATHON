const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
    maxWorkers: 2,
    watcher: {
        healthCheck: { enabled: false },
        watchman: { enabled: false },
    },
    resolver: {
        unstable_enablePackageExports: true,
    },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
