// Signs `assembleRelease` with the Physio360 upload keystore instead of the debug key.
// Reads PHYSIO360_KEYSTORE / PHYSIO360_KEYSTORE_PASSWORD / PHYSIO360_KEY_ALIAS / PHYSIO360_KEY_PASSWORD
// from the environment or ~/.gradle/gradle.properties at build time, so no secret is
// ever written into the repository. Without them the build falls back to debug signing.
const { withAppBuildGradle } = require('expo/config-plugins');

const MARK = '// physio360-release-signing';

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    let gradle = cfg.modResults.contents;
    if (gradle.includes(MARK)) return cfg;

    const prop = (name) => `(System.getenv("${name}") ?: (project.findProperty("${name}") ?: ""))`;
    gradle = gradle.replace(
      /signingConfigs\s*\{/,
      `signingConfigs {
        ${MARK}
        release {
            def ks = ${prop('PHYSIO360_KEYSTORE')}
            if (ks) {
                storeFile file(ks)
                storePassword ${prop('PHYSIO360_KEYSTORE_PASSWORD')}
                keyAlias ${prop('PHYSIO360_KEY_ALIAS')}
                keyPassword ${prop('PHYSIO360_KEY_PASSWORD')}
            }
        }`,
    );
    // Use the release config for release builds when a keystore is configured.
    gradle = gradle.replace(
      /(buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?)signingConfig signingConfigs\.debug/,
      `$1signingConfig(${prop('PHYSIO360_KEYSTORE')} ? signingConfigs.release : signingConfigs.debug)`,
    );
    cfg.modResults.contents = gradle;
    return cfg;
  });
};
