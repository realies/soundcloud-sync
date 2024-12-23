export interface Client {
  id: string;
  version: string;
  targetUrn: string;
}

export interface Track {
  id: number;
  title: string;
  artist: string;
  artwork_url?: string;
  media: {
    transcodings: Array<{
      url: string;
      format: {
        protocol: string;
        mime_type: string;
      };
    }>;
  };
  publisher_metadata?: {
    artist: string;
    release_title: string;
  };
}

export interface UserLike {
  created_at: string;
  track: Track;
}

export interface UserLikesResponse {
  collection: UserLike[];
  next_href?: string;
}

export interface SoundCloudSyncOptions {
  username: string;
  folder?: string;
  limit?: number;
}
