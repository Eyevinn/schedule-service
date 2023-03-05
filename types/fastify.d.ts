import { IDbChannelsAdapter, IDbScheduleEventsAdapter, IDbMRSSFeedsAdapter, IDbPlaylistsAdapter } from "../src/db/interface";

// Declaration merging
declare module 'fastify' {
  export interface FastifyInstance {
      db: {
        channels: IDbChannelsAdapter;
        scheduleEvents: IDbScheduleEventsAdapter;
        mrssFeeds: IDbMRSSFeedsAdapter;
        playlists: IDbPlaylistsAdapter;
      }
  }
}
