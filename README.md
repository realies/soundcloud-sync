# SoundCloud Sync

A library and CLI tool to sync your SoundCloud likes to local files.

## Features

- Download liked tracks from any SoundCloud profile
- Automatic metadata tagging (title, artist, artwork) using ID3v2
- Preserves like dates as file modification times
- Supports incremental syncing (only downloads new likes)
- Can be used as a library in other projects
- No external dependencies required (pure JavaScript/TypeScript implementation)
- Cross-platform support with pre-built binaries

## Quick Start

### CLI Usage

```bash
# Install globally
npm install -g soundcloud-sync

# Download your likes
soundcloud-sync -u your-username
```

Pre-built binaries are also available from the [releases page](https://github.com/realies/soundcloud-sync/releases) for:
- Linux (x64, ARM64)
- macOS (x64, ARM64/Apple Silicon)
- Windows (x64)

### Library Usage

```bash
# Install in your project
npm install soundcloud-sync
# or
yarn add soundcloud-sync
```

```typescript
import { soundCloudSync } from 'soundcloud-sync';

await soundCloudSync({
  username: 'your-username',
  limit: 100,
  folder: './my-music'
});
```

## Documentation

- [API Reference](API.md)

## Releases

Published automatically to:
- [npm](https://www.npmjs.com/package/soundcloud-sync)
- [GitHub Releases](https://github.com/realies/soundcloud-sync/releases) (pre-built binaries)
