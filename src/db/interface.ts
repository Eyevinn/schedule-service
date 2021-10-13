import { Channel } from "../models/channelModel";
import { ScheduleEvent, ScheduleRangeOptions } from "../models/scheduleModel";

export interface IDbPluginOptions {
  uri: string;
  channelsTableName?: string;
  schedulesTableName?: string;
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
  //addScheduleEvent: (scheduleEvent: ScheduleEvent) => Promise<ScheduleEvent>;
  //removeScheduleEvents: (channelId: string, rangeOpts: ScheduleRangeOptions) => Promise<number>;
  //removeEvent: (channelId: string, eventId: string) => Promise<boolean>;
  //getScheduleEventsByChannelId: (channelId: string, rangeOpts: ScheduleRangeOptions) => Promise<ScheduleEvent[]>;
}