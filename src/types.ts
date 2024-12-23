/**
 * Options for the high-level soundCloudSync function.
 */
export interface SoundCloudSyncOptions {
  /** SoundCloud username to fetch likes from */
  username: string;
  /** Output folder for downloaded tracks (default: ./music) */
  folder?: string;
  /** Number of latest likes to fetch */
  limit?: number;
}

/**
 * SoundCloud API client details needed for authenticated requests.
 */
export interface Client {
  /** Client ID for API authentication */
  id: string;
  /** API version string */
  version: string;
  /** User's URN (unique identifier) */
  urn: string;
}

/**
 * SoundCloud track information.
 */
export interface Track {
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

/**
 * A liked track with its creation timestamp.
 */
export interface UserLike {
  /** When the track was liked */
  created_at: string;
  /** The liked track's details */
  track: Track;
}

/**
 * Callbacks for track download progress events.
 */
export interface Callbacks {
  /** Called when starting to download a track */
  onDownloadStart?: (track: Track) => void;
  /** Called when a track has been downloaded */
  onDownloadComplete?: (track: Track) => void;
  /** Called when a track download fails */
  onDownloadError?: (track: Track, error: unknown) => void;
}

/**
 * Result of a track download operation.
 */
export interface DownloadResult {
  /** Title of the downloaded track */
  track: string;
  /** FFmpeg process output */
  ffmpeg: {
    /** Standard output from FFmpeg */
    stdout: string;
    /** Standard error from FFmpeg */
    stderr: string;
  };
}
