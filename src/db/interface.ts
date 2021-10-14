import { Channel } from "../models/channelModel";
import { ScheduleEvent, ScheduleRangeOptions } from "../models/scheduleModel";

export interface IDbPluginOptions {
  uri: string;
  channelsTableName?: string;
  schedulesTableName?: string;
  mrssFeedsTableName?: string;
}

export interface IDbChannelsAdapter {
  init: () => Promise<void>;
  list: (tenant: string) => Promise<Channel[]>;
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

export interface IDbMRSSFeedsAdapter {
  init: () => Promise<void>;
}