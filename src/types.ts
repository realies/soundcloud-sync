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
  /** Whether to verify and update timestamps of existing files */
  verifyTimestamps?: boolean;
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
  /** Called when a track's timestamp has been updated */
  onTimestampUpdate?: (track: Track, oldDate: Date, newDate: Date) => void;
}

/**
 * Result of a track download operation.
 */
export interface DownloadResult {
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
