import { Channel } from "../models/channelModel";

export interface IDbPluginOptions {
  uri: string;
  channelsTableName?: string;
  schedulesTableName?: string;
}

export interface IDbAdapter {
  init: () => Promise<void>;
  listChannels: () => Promise<Channel[]>;
}