import fetch from "node-fetch";
import xmlparser from "fast-xml-parser";
import dayjs from "dayjs";
import Debug from "debug";
import { Type } from '@sinclair/typebox'

import { hlsduration } from "@eyevinn/hls-duration";

const debug = Debug("mrss-feed");

interface MRSSFeedConfig {
  scheduleRetention: number,
}

export interface MRSSFeedAttr {
  id: string;
  tenant: string;
  url: string;
  channelId: string;
  config: MRSSFeedConfig;
}

export interface MRSSAsset {
  id: string;
  title: string;
  url: string;
  duration: number;
}

interface MRSSCache {
  updated: number;
  assets: MRSSAsset[];
}

export class MRSSFeed {
  private attrs: MRSSFeedAttr;
  private cache: MRSSCache;

  public static schema = Type.Object({
    id: Type.String(),
    tenant: Type.String(),
    url: Type.String(),
    channelId: Type.String(),
  });

  constructor(attrs: MRSSFeedAttr) {
    this.attrs = {
      id: attrs.id,
      tenant: attrs.tenant,
      url: attrs.url,
      channelId: attrs.channelId,
      config: attrs.config,
    };
  }

  get item(): MRSSFeedAttr {
    return {
      id: this.attrs.id,
      tenant: this.attrs.tenant,
      url: this.attrs.url,
      channelId: this.attrs.channelId,
      config: this.attrs.config,
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

  get config() {
    return this.attrs.config;
  }

  getAssets() {
    return this.cache ? this.cache.assets : [];
  }

  async refresh() {
    const response = await fetch(this.attrs.url);
    const xml = await response.text();
    const json = xmlparser.parse(xml);
    if (!this.cache) {
      this.cache = {
        updated: dayjs(json.feed.updated).unix(),
        assets: [],
      };
    }
    if (dayjs(json.feed.updated).unix() >= this.cache.updated) {
      debug("Feed is newer than the cache, update the entries");
      this.cache.updated = dayjs().unix();
      const feedEntry = json.feed.entry;
      let feedEntryLength;
      if (feedEntry && feedEntry.length) {
        feedEntryLength = feedEntry.length;
      } else if (typeof feedEntry === "object" && feedEntry !== null && feedEntry.id) {
        debug("Entry list is an object");
        this.addEntryToCache(feedEntry);
        feedEntryLength = 0;
      } else {
        debug("Entry list is empty");
        feedEntryLength = 0;
      }
      for (let i = 0; i < feedEntryLength; i++) {
        const entry = json.feed.entry[i];
        this.addEntryToCache(entry);
      }
      for (const asset of this.cache.assets) {
        if (asset.duration === -1) {
          // update duration
          const duration = await hlsduration(new URL(asset.url));
          asset.duration = Math.ceil(duration);
          debug(`Updated asset duration for ${asset.title} to ${asset.duration}`);
        }
      }
    }
  }

  private addEntryToCache(feedEntry: any) {
    let cachedAsset = this.cache.assets.find(a => a.id === feedEntry.id);
    if (cachedAsset) {
      cachedAsset.title = feedEntry.title;
      cachedAsset.url = feedEntry.link;
      cachedAsset.duration = -1;
    } else {
      debug("Adding new entry to cache");
      this.cache.assets.push({
        id: feedEntry.id,
        title: feedEntry.title,
        url: feedEntry.link,
        duration: -1,
      });
    }
  }
}
