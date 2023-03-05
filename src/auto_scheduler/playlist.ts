import Debug from "debug";
import dayjs from "dayjs";
import { v4 as uuidv4 } from "uuid";

import { IDbPlaylistsAdapter, IDbScheduleEventsAdapter, IDbChannelsAdapter } from "../db/interface";
import { Playlist } from "../models/playlistModel";
import { Channel } from "../models/channelModel";
import { findOngoingAndFutureEvents, findLastEndTime } from "../util/events";
import { ScheduleEvent, ScheduleEventType } from "../models/scheduleModel";

const debug = Debug("playlist-auto-scheduler");

export class PlaylistAutoScheduler {
  private playlistsDb: IDbPlaylistsAdapter;
  private scheduleEventsDb: IDbScheduleEventsAdapter;
  private channelsDb: IDbChannelsAdapter;
  private activePlaylists: Playlist[];

  constructor(playlistsDb: IDbPlaylistsAdapter, scheduleEventsDb: IDbScheduleEventsAdapter, channelsDb: IDbChannelsAdapter) {
    this.playlistsDb = playlistsDb;
    this.scheduleEventsDb = scheduleEventsDb;
    this.channelsDb = channelsDb;
    this.activePlaylists = [];
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
        channelId: "playlist",
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
    this.activePlaylists = await this.playlistsDb.listAll();
    const timer = setInterval(async () => {
      try {
        debug("TICK started");
        await this.tick();
        debug("TICK completed");
      } catch (err) {
        console.error(err);
      }
    }, 5000);
    const playlistUpdateTimer = setInterval(async () => {
      try {
        debug("Update list of active playlists");
        let playlists = await this.playlistsDb.listAll();
        // New playlist added?
        for (let playlist of playlists) {
          if (!(this.activePlaylists.find(p => p.id === playlist.id))) {
            debug(`New playlist ${playlist.id} found, adding to active list of playlists`);
            this.activePlaylists.push(playlist);
          }
        }
        // Remove playlists that are not active
        this.activePlaylists = this.activePlaylists.filter(active => playlists.find(p => p.id === active.id));
        debug("Active playlists: " + this.activePlaylists.map(p => p.id).join(" "));
      } catch (err) {
        console.error(err);
      }
    }, 60 * 1000);
  }

  async tick() {
    for(const playlist of this.activePlaylists) {
      try {
        await this.populate(playlist);
        await this.cleanup(playlist);
      } catch (error) {
        debug(error);
        console.error("Failed to populate schedule events for playlist: " + playlist.id);
      }
    }
  }

  private async populate(playlist: Playlist) {
    const now = dayjs();
    await playlist.refresh();
    const scheduleEvents = await this.scheduleEventsDb.getScheduleEventsByChannelId(playlist.channelId, {
      start: now.subtract(2 * 60 * 60, "second").valueOf(),
      end: now.add(12 * 60 * 60, "second").valueOf(),
    });
    const ongoingAndFutureScheduleEvents = findOngoingAndFutureEvents(scheduleEvents, now);
    if (ongoingAndFutureScheduleEvents.length <= 4) {
      const numberOfScheduleEvents = 5 - ongoingAndFutureScheduleEvents.length;
      let scheduleEventsToAdd: ScheduleEvent[] = [];
      let nextStartTime = findLastEndTime(ongoingAndFutureScheduleEvents, now);
      for (let i = 0; i < numberOfScheduleEvents; i++) {
        let asset = playlist.getNext();
        if (asset) {
          const totalScheduleEventDuration = asset.duration;
          const nextEndTime = nextStartTime + totalScheduleEventDuration * 1000;
          console.log(`[${playlist.channelId}]: Adding schedule event (${ScheduleEventType.VOD}): title=${asset.title}, start=${new Date(nextStartTime).toISOString()}, end=${new Date(nextEndTime).toISOString()}`);
          scheduleEventsToAdd.push(new ScheduleEvent({
            id: uuidv4(),
            channelId: playlist.channelId,
            title: asset.title,
            duration: totalScheduleEventDuration,
            start_time: nextStartTime,
            end_time: nextEndTime,
            url: asset.url,
            type: ScheduleEventType.VOD,
          }));
          nextStartTime = nextEndTime;
        }
      }
      for (const scheduleEvent of scheduleEventsToAdd) {
        await this.scheduleEventsDb.add(scheduleEvent);
      }
    }
  }

  private async cleanup(playlist: Playlist) {
    const numEventsRemoved = await this.scheduleEventsDb.removeScheduleEvents(playlist.channelId, { age: 1 * 60 * 60 });
    if (numEventsRemoved) {
      console.log(`[${playlist.channelId}]: Cleaned up and removed ${numEventsRemoved} schedule events for channel`);
    }
  }
}