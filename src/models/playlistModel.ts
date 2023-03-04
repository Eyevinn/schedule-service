import fetch from "node-fetch";
import { Type, Static } from '@sinclair/typebox'
import Debug from "debug";
import dayjs from "dayjs";

import { hlsduration } from "@eyevinn/hls-duration";

const debug = Debug("playlist");

export interface PlaylistAttr {
  id: string;
  tenant: string;
  url: string;
  channelId: string;
}

export interface PlaylistEntry {
  url: string;
  duration: number;
}

interface PlaylistCache {
  updated: number;
  assets: PlaylistEntry[];
}

export const PlaylistSchema = Type.Object({
  id: Type.String(),
  tenant: Type.String(),
  url: Type.String(),
  channelId: Type.String()
});
export type TPlaylist = Static<typeof PlaylistSchema>;

export class Playlist {
  private attrs: PlaylistAttr;
  private cache: PlaylistCache;
  private position: number;

  public static schema = PlaylistSchema;

  constructor(attrs: PlaylistAttr) {
    this.attrs = {
      id: attrs.id,
      tenant: attrs.tenant,
      url: attrs.url,
      channelId: attrs.channelId,
    };
    this.position = -1;
  }

  get item(): PlaylistAttr {
    return {
      id: this.attrs.id,
      tenant: this.attrs.tenant,
      url: this.attrs.url,
      channelId: this.attrs.channelId,
    };
  }

  get id() {
    return this.attrs.id;
  }

  get tenant() {
    return this.attrs.tenant;
  }

  get url() {
    return this.attrs.url;
  }

  get channelId() {
    return this.attrs.channelId;
  }

  getAssets() {
    return this.cache ? this.cache.assets : [];
  }

  async refresh() {
    const response = await fetch(this.attrs.url);
    if (response.ok) {
      const body = await response.text();
      const entries = body.split(/\r?\n/).filter(l => l !== '').map(l => new URL(l.trim()));
      if (!this.cache) {
        this.cache = {
          updated: dayjs().unix(),
          assets: [],
        };
        this.position = 0;
      }
      for (const entry of entries) {
        this.cache.assets.push({ url: entry, duration: -1 });
      }
      for (const asset of this.cache.assets) {
        if (asset.duration === -1) {
          // update duration
          const duration = await hlsduration(new URL(asset.url));
          asset.duration = Math.ceil(duration);
          debug(`Updated asset duration for ${asset.url} to ${asset.duration}`);
        }
      }
    }
  }
}