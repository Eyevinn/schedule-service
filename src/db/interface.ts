import { Channel } from "../models/channelModel";
import { ScheduleEvent, ScheduleRangeOptions } from "../models/scheduleModel";
import { MRSSFeed } from "../models/mrssFeedModel";
import { Playlist } from "../models/playlistModel";
import { Collection } from "../models/collectionModel";

export interface IDbPluginOptions {
  uri: string;
  channelsTableName?: string;
  schedulesTableName?: string;
  mrssFeedsTableName?: string;
  playlistsTableName?: string;
}

export interface IDbChannelsAdapter {
  init: () => Promise<void>;
  list: (tenant: string) => Promise<Channel[]>;
  listAll: () => Promise<Channel[]>;
  add: (channel: Channel) => Promise<void>;
  update: (channel: Channel) => Promise<boolean>;
  getChannelById: (id: string) => Promise<Channel>;
  remove: (id: string) => Promise<void>;
}

export interface IDbScheduleEventsAdapter {
  init: () => Promise<void>;
  add: (scheduleEvent: ScheduleEvent) => Promise<ScheduleEvent>;
  getScheduleEventsByChannelId: (channelId: string, rangeOpts: ScheduleRangeOptions) => Promise<ScheduleEvent[]>;
  remove: (id: string) => Promise<boolean>;
  removeScheduleEvents: (channelId: string, rangeOpts: ScheduleRangeOptions) => Promise<number>;
}

export interface IDbCollectionsAdapter {
  init: () => Promise<void>;
  list: (tenant: string) => Promise<Collection[]>;
  listAll: () => Promise<Collection[]>;
  add: (collection: Collection) => Promise<void>;
  getCollectionById: (id: string) => Promise<Collection>;
  remove: (id: string) => Promise<void>;
}

export interface IDbMRSSFeedsAdapter {
  init: () => Promise<void>;
  list: (tenant: string) => Promise<MRSSFeed[]>;
  listAll: () => Promise<MRSSFeed[]>;
  getMRSSFeedById: (id: string) => Promise<MRSSFeed>;
  getMRSSFeedsByChannelId: (channelId: string) => Promise<MRSSFeed[]>;
  add: (mrssFeed: MRSSFeed) => Promise<MRSSFeed>;
  remove: (id: string) => Promise<void>;
}

export interface IDbPlaylistsAdapter {
  init: () => Promise<void>;
  list: (tenant: string) => Promise<Playlist[]>;
  listAll: () => Promise<Playlist[]>;
  getPlaylistById: (id: string) => Promise<Playlist>;
  add: (playlist: Playlist) => Promise<Playlist>;
  remove: (id: string) => Promise<void>;
}