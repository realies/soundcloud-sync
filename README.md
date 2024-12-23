# SoundCloud Sync

A library and CLI tool to sync your SoundCloud likes to local files.

![](https://i.snipboard.io/ZfMQL5.jpg)

## Features

- Download liked tracks from any SoundCloud profile
- Automatic metadata tagging (title, artist, artwork)
- Preserves like dates as file modification times
- Supports incremental syncing (only downloads new likes)
- Can be used as a library in other projects

## Usage

The CLI accepts the following arguments:
```bash
<username>        # Required: SoundCloud username to fetch likes from
[folder]          # Optional: Output folder (default: ./music)
--limit <number>  # Optional: Maximum number of likes to fetch
```

### Node.js

```bash
# Install globally
npm install -g soundcloud-sync

# Or install locally
yarn add soundcloud-sync

# Basic usage
soundcloud-sync realies

# Custom folder
soundcloud-sync realies ./my-music

# Limit number of likes
soundcloud-sync realies --limit 100

# With debug logs
LOG_LEVEL=debug soundcloud-sync realies
```

### Deno

```bash
# Install globally
deno install -n soundcloud-sync --allow-net --allow-write --allow-read https://deno.land/x/soundcloud_sync/cli.ts

# Basic usage
soundcloud-sync realies

# Custom folder
soundcloud-sync realies ./my-music

# Limit number of likes
soundcloud-sync realies --limit 100

# With debug logs
LOG_LEVEL=debug soundcloud-sync realies
```

## Development

Clone and install dependencies:
```bash
git clone https://github.com/realies/soundcloud-sync.git
cd soundcloud-sync
yarn install
```

Run locally:
```bash
# Basic usage
yarn start realies

# With debug logs
LOG_LEVEL=debug yarn start realies
```

## Releases

Published automatically to [npm](https://www.npmjs.com/package/soundcloud-sync)
