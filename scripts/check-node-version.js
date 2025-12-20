const required = { major: 24, minor: 12, patch: 0 };
const [major, minor, patch] = process.versions.node.split('.').map((part) => Number.parseInt(part, 10));

const versionTooLow =
  !Number.isFinite(major) ||
  major !== required.major ||
  minor < required.minor ||
  (minor === required.minor && patch < required.patch);

if (versionTooLow) {
  console.error(
    `STEVI requires Node.js ${required.major}.${required.minor}.${required.patch}+ (24.12.0 or newer within Node 24). ` +
      `You are running ${process.versions.node}. Please upgrade (e.g., \`nvm use\`) before installing dependencies.`,
  );
  process.exit(1);
}
