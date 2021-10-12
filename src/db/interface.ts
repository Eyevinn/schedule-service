import { Channel } from "../models/channelModel";
import { ScheduleEvent, ScheduleRangeOptions } from "../models/scheduleModel";

export interface IDbPluginOptions {
  uri: string;
  channelsTableName?: string;
  schedulesTableName?: string;
}

export interface IDbAdapter {
  init: () => Promise<void>;
  listChannels: (tenant: string) => Promise<Channel[]>;
  addChannel: (channel: Channel) => Promise<void>;
  updateChannel: (channel: Channel) => Promise<boolean>;
  getChannelById: (id: string) => Promise<Channel>;
  removeChannel: (id: string) => Promise<void>;
  //addScheduleEvent: (scheduleEvent: ScheduleEvent) => Promise<ScheduleEvent>;
  //removeScheduleEvents: (channelId: string, rangeOpts: ScheduleRangeOptions) => Promise<number>;
  //removeEvent: (channelId: string, eventId: string) => Promise<boolean>;
  //getScheduleEventsByChannelId: (channelId: string, rangeOpts: ScheduleRangeOptions) => Promise<ScheduleEvent[]>;
}