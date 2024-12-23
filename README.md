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
# Install dependencies
yarn install

# Basic usage
yarn start realies

# Custom folder
yarn start realies ./my-music

# Limit number of likes
yarn start realies --limit 100

# With debug logs
LOG_LEVEL=debug yarn start realies
```

### Deno

```bash
# Basic usage
deno task start realies

# Custom folder
deno task start realies ./my-music

# Limit number of likes
deno task start realies --limit 100

# With debug logs
LOG_LEVEL=debug deno task start realies
```
