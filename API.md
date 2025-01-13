# Documentation

## CLI Tool

### Installation
```bash
npm install -g soundcloud-sync
```

### Usage
```
Usage:
  soundcloud-sync [options]

Options:
  --user, -u <value> (required)    SoundCloud username to fetch likes from
  --limit, -l <value>              Number of latest likes to fetch
  --folder, -f <value>             Output folder (default: ./music)
  --verify-timestamps              Verify and update timestamps of existing files
  --no-download                    Skip downloading new tracks
  --help, -h                       Show this help message
```

### Debug Logging
Add `LOG_LEVEL=debug` before any command to see detailed logs:
```bash
LOG_LEVEL=debug soundcloud-sync -u your-username
```

## Library

### Installation

#### Node.js
```bash
npm install soundcloud-sync
# or
yarn add soundcloud-sync
```

#### Deno
```typescript
import { soundCloudSync } from "https://raw.githubusercontent.com/realies/soundcloud-sync/master/mod.ts";
```

### Functions

#### soundCloudSync(options)

High-level function that combines all steps for ease of use.

```typescript
function soundCloudSync(options: SoundCloudSyncOptions): Promise<void>
```

#### getClient(profileName)

Gets the SoundCloud client information needed for API requests.

```typescript
function getClient(profileName: string): Promise<Client>
```

#### getUserLikes(client, offset?, limit?)

Fetches liked tracks for a SoundCloud user.

```typescript
function getUserLikes(
  client: Client,
  offset?: string,
  limit?: number,
): Promise<UserLike[]>
```

#### getMissingMusic(likes, folder?, callbacks?)

Downloads missing tracks from a list of liked tracks.

```typescript
function getMissingMusic(
  likes: UserLike[],
  folder?: string,
  callbacks?: Callbacks,
): Promise<DownloadResult[]>
```

#### verifyTimestamps(likes, folder, callbacks?)

Verifies and updates timestamps of existing files to match their like dates.

```typescript
function verifyTimestamps(
  likes: UserLike[],
  folder: string,
  callbacks?: Callbacks,
): Promise<VerifyTimestampResult[]>
```

### Types

```typescript
interface SoundCloudSyncOptions {
  /** SoundCloud username to fetch likes from */
  username: string;
  /** Output folder for downloaded tracks (default: ./music) */
  folder?: string;
  /** Number of latest likes to fetch */
  limit?: number;
  /** Whether to verify and update timestamps of existing files */
  verifyTimestamps?: boolean;
  /** Whether to skip downloading new tracks */
  noDownload?: boolean;
}

interface Client {
  /** Client ID for API authentication */
  id: string;
  /** API version string */
  version: string;
  /** User's URN (unique identifier) */
  urn: string;
}

interface Track {
  /** Track's unique identifier */
  id: number;
  /** Track title */
  title: string;
  /** Track artist */
  artist: string;
  /** URL to track artwork */
  artwork_url?: string;
  /** Media transcoding information */
  media: {
    /** Available audio formats */
    transcodings: Array<{
      /** URL to fetch audio data */
      url: string;
      /** Format details */
      format: {
        /** Streaming protocol (e.g., 'progressive') */
        protocol: string;
        /** Content type (e.g., 'audio/mpeg') */
        mime_type: string;
      };
    }>;
  };
  /** Additional metadata from publisher */
  publisher_metadata?: {
    /** Artist name from publisher */
    artist: string;
    /** Release title from publisher */
    release_title: string;
  };
}

interface UserLike {
  /** When the track was liked */
  created_at: string;
  /** The liked track's details */
  track: Track;
}

interface Callbacks {
  /** Called when starting to download a track */
  onDownloadStart?: (track: Track) => void;
  /** Called when a track has been downloaded */
  onDownloadComplete?: (track: Track) => void;
  /** Called when a track download fails */
  onDownloadError?: (track: Track, error: unknown) => void;
  /** Called when a track's timestamp has been updated */
  onTimestampUpdate?: (track: Track, oldDate: Date, newDate: Date) => void;
}

interface DownloadResult {
  /** Title of the downloaded track */
  track: string;
  /** Download status */
  status: {
    /** Whether the download was successful */
    success: boolean;
    /** Any error message if the download failed */
    error?: string;
  };
}

interface VerifyTimestampResult {
  /** Title of the verified track */
  track: string;
  /** Verification status */
  status: {
    /** Whether the timestamp was verified successfully */
    success: boolean;
    /** Whether the timestamp needed updating */
    updated: boolean;
    /** Any error message if verification failed */
    error?: string;
  };
}
```

### Examples

```typescript
// High-level usage
import { soundCloudSync } from 'soundcloud-sync';

// Download latest likes
await soundCloudSync({
  username: 'your-username',
  limit: 100,
  folder: './my-music',
});

// Only verify timestamps of existing files
await soundCloudSync({
  username: 'your-username',
  limit: 100,
  verifyTimestamps: true,
  noDownload: true,
});

// Verify timestamps and download new tracks
await soundCloudSync({
  username: 'your-username',
  limit: 100,
  verifyTimestamps: true,
});

// Low-level usage with individual functions
import { getClient, getUserLikes, getMissingMusic, verifyTimestamps } from 'soundcloud-sync';

const client = await getClient('your-username');
const likes = await getUserLikes(client, '0', 100);

// Define callbacks for progress tracking
const callbacks = {
  onDownloadStart: (track) => console.log(`Starting "${track.title}"`),
  onDownloadComplete: (track) => console.log(`Completed "${track.title}"`),
  onDownloadError: (track, error) => console.error(`Failed "${track.title}": ${error}`),
  onTimestampUpdate: (track, oldDate, newDate) =>
    console.log(`Updated timestamp for "${track.title}" from ${oldDate.toISOString()} to ${newDate.toISOString()}`),
};

// Verify timestamps of existing files
const verifyResults = await verifyTimestamps(likes, './my-music', callbacks);
console.log('Updated files:', verifyResults.filter(r => r.status.updated).map(r => r.track));
console.log('Failed verifications:', verifyResults.filter(r => !r.status.success).map(r => r.track));

// Download missing tracks
const results = await getMissingMusic(likes, './my-music', callbacks);
console.log('Downloaded tracks:', results.filter(r => r.status.success).map(r => r.track));
console.log('Failed tracks:', results.filter(r => !r.status.success).map(r => r.track));
```

```bash
# Download your likes
soundcloud-sync -u your-username

# Download with all options
soundcloud-sync -u your-username --limit 100 --folder ./my-music

# Only verify timestamps of existing files
soundcloud-sync -u your-username --verify-timestamps --no-download

# Verify timestamps and download new tracks
soundcloud-sync -u your-username --verify-timestamps --limit 100
```
