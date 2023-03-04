import { IDbPlaylistsAdapter, IDbScheduleEventsAdapter, IDbChannelsAdapter } from "../db/interface";
import Debug from "debug";
import { Playlist } from "../models/playlistModel";
import { Channel } from "../models/channelModel";

const debug = Debug("playlist-auto-scheduler");

export class PlaylistAutoScheduler {
  private playlistsDb: IDbPlaylistsAdapter;
  private scheduleEventsDb: IDbScheduleEventsAdapter;
  private channelsDb: IDbChannelsAdapter;

  constructor(playlistsDb: IDbPlaylistsAdapter, scheduleEventsDb: IDbScheduleEventsAdapter, channelsDb: IDbChannelsAdapter) {
    this.playlistsDb = playlistsDb;
    this.scheduleEventsDb = scheduleEventsDb;
    this.channelsDb = channelsDb;

  }

  // insert demo playlist if not exists
  async bootstrap(demoTenant: string) {
    const availablePlaylists = await this.playlistsDb.listAll();
    if (availablePlaylists.find(pl => pl.id === "eyevinn")) {
      debug("Demo playlist already available");
    } else {
      debug("Creating demo playlist");
      const demoPlaylist = new Playlist({
        id: "eyevinn",
        tenant: demoTenant,
        channelId: "eyevinn",
        url: "https://testcontent.eyevinn.technology/fast/svtdemo.txt",
      });
      const demoChannel = await this.channelsDb.getChannelById("playlist");
      if (!demoChannel) {
        debug("Creating demo channel");
        await this.channelsDb.add(new Channel({
          id: "playlist",
          tenant: demoTenant,
          title: "Demo Channel",
          audioTracks: [ { language: "en", name: "English", default: true }]
        }));
      }
      await this.playlistsDb.add(demoPlaylist);
    }
  }

  async run() {
    
  }

  private async cleanup(playlist: Playlist) {
    const numEventsRemoved = await this.scheduleEventsDb.removeScheduleEvents(playlist.channelId, { age: 1 * 60 * 60 });
    if (numEventsRemoved) {
      console.log(`[${playlist.channelId}]: Cleaned up and removed ${numEventsRemoved} schedule events for channel`);
    }
  }
}