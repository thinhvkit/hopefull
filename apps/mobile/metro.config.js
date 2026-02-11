const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');
const chatPkgRoot = path.resolve(monorepoRoot, '../rn-firebase-chat');

// Watch the monorepo and the linked rn-firebase-chat lib folder
config.watchFolders = [
  monorepoRoot,
  path.resolve(chatPkgRoot, 'lib'),
];

// Resolve all modules from the project's node_modules first,
// so rn-firebase-chat's own node_modules are never used
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// Block Metro from crawling rn-firebase-chat/node_modules
config.resolver.blockList = [
  new RegExp(path.resolve(chatPkgRoot, 'node_modules').replace(/[/\\]/g, '[/\\\\]') + '.*'),
];

// Follow symlinks
config.resolver.unstable_enableSymlinks = true;

// Ensure react-native export condition is resolved for packages like axios
config.resolver.unstable_conditionNames = [
  'react-native',
  'browser',
  'require',
  'import',
  'default',
];

// Stub out optional peer dependencies that are not installed
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === '@react-native-firebase/storage') {
    return { type: 'empty' };
  }
  // Force axios to use browser build instead of Node build
  if (moduleName === 'axios') {
    return context.resolveRequest(context, 'axios/dist/browser/axios.cjs', platform);
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
