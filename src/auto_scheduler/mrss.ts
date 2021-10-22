import { FastifyInstance, FastifyPluginAsync, FastifyPluginOptions } from "fastify";
import fp from "fastify-plugin";
import Debug from "debug";
import dayjs from "dayjs";
import { v4 as uuidv4 } from "uuid";

import { MRSSFeed } from "../models/mrssFeedModel";
import { ScheduleEvent } from "../models/scheduleModel";
import { Channel } from "../models/channelModel";
import { IDbMRSSFeedsAdapter, IDbScheduleEventsAdapter, IDbChannelsAdapter } from "../db/interface";

const debug = Debug("mrss-auto-scheduler");

export const MRSSAutoSchedulerAPI: FastifyPluginAsync = async (server: FastifyInstance, options: FastifyPluginOptions) => {
  const { prefix } = options;

  server.register(async (server: FastifyInstance) => {
    server.get("/mrss", {
      schema: {
        response: {
          200: {
            type: "array",
            items: MRSSFeed.schema,
          }
        }
      }
    }, async (request, reply) => {
      const tenant = request.headers["host"];
      try {
        if (tenant.match(/^localhost/)) {
          const feeds: MRSSFeed[] = await server.db.mrssFeeds.listAll();
          return reply.code(200).send(feeds);
        } else {
          const feeds: MRSSFeed[] = await server.db.mrssFeeds.list(tenant);
          return reply.code(200).send(feeds);
        }
      } catch (error) {
        request.log.error(error);
        return reply.send(500);
      }
    });  
  }, { prefix });
};

export default fp(MRSSAutoSchedulerAPI);

export class MRSSAutoScheduler {
  private feedsDb: IDbMRSSFeedsAdapter;
  private scheduleEventsDb: IDbScheduleEventsAdapter;
  private channelsDb: IDbChannelsAdapter;
  private activeFeeds: MRSSFeed[];

  constructor(feedsDb: IDbMRSSFeedsAdapter, scheduleEventsDb: IDbScheduleEventsAdapter, channelsDb: IDbChannelsAdapter) {
    this.feedsDb = feedsDb;
    this.scheduleEventsDb = scheduleEventsDb;
    this.channelsDb = channelsDb;
    this.activeFeeds = [];
  }

  // insert demo feed if not exists
  async bootstrap(demoTenant: string) {
    const availableFeeds = await this.feedsDb.listAll();
    if (availableFeeds.find(feed => feed.id === "eyevinn")) {
      debug("Demo feed already available");
    } else {
      debug("Creating demo feed");
      const demoFeed = new MRSSFeed({
        id: "eyevinn",
        tenant: demoTenant,
        channelId: "eyevinn",
        url: "https://testcontent.mrss.eyevinn.technology/eyevinn.mrss?preroll=true",
        config: {
          scheduleRetention: 3 // hours
        }
      });
      const demoChannel = await this.channelsDb.getChannelById("eyevinn");
      if (!demoChannel) {
        debug("Creating demo channel");
        await this.channelsDb.add(new Channel({
          id: "eyevinn",
          tenant: demoTenant,
          title: "Demo Channel"
        }));
      }
      await this.feedsDb.add(demoFeed);
    }
  }

  async run() {
    this.activeFeeds = await this.feedsDb.listAll();
    const timer = setInterval(async () => {
      try {
        debug("TICK started");
        await this.tick();
        debug("TICK completed");
      } catch (err) {
        console.error(err);
      }
    }, 5000);
  }

  async tick() {
    for(const feed of this.activeFeeds) {
      try {
        await this.populate(feed);
        if (feed.config.scheduleRetention > 0) {
          await this.cleanup(feed);
        }
      } catch (error) {
        debug(error);
        console.error("Failed to populate schedule events for feed: " + feed.id);
      }
    }
  }

  private async populate(feed: MRSSFeed) {
    const now = dayjs();
    await feed.refresh();
    const assets = feed.getAssets();
    const scheduleEvents = await this.scheduleEventsDb.getScheduleEventsByChannelId(feed.channelId, {
      start: now.subtract(2 * 60 * 60, "second").valueOf(),
      end: now.add(12 * 60 * 60, "second").valueOf(),
    });
    const ongoingAndFutureScheduleEvents = this.findOngoingAndFutureEvents(scheduleEvents, now);
    if (ongoingAndFutureScheduleEvents.length <= 4) {
      const numberOfScheduleEvents = 5 - ongoingAndFutureScheduleEvents.length;
      let scheduleEventsToAdd: ScheduleEvent[] = [];
      let nextStartTime = this.findLastEndTime(ongoingAndFutureScheduleEvents, now);
      for (let i = 0; i < numberOfScheduleEvents; i++) {
        let asset = assets[Math.floor(Math.random() * assets.length)];
        if (asset) {
          const totalScheduleEventDuration = asset.duration;
          const nextEndTime = nextStartTime + totalScheduleEventDuration * 1000;
          console.log(`[${feed.channelId}]: Adding schedule event: title=${asset.title}, start=${new Date(nextStartTime).toISOString()}, end=${new Date(nextEndTime).toISOString()}`);
          scheduleEventsToAdd.push(new ScheduleEvent({
            id: uuidv4(),
            channelId: feed.channelId,
            title: asset.title,
            duration: totalScheduleEventDuration,
            start_time: nextStartTime,
            end_time: nextEndTime,
            url: asset.url
          }));
          nextStartTime = nextEndTime;
        }
      }
      for (const scheduleEvent of scheduleEventsToAdd) {
        await this.scheduleEventsDb.add(scheduleEvent);
      }
    }
  }

  private async cleanup(feed: MRSSFeed) {
    const numEventsRemoved = await this.scheduleEventsDb.removeScheduleEvents(feed.channelId, { age: feed.config.scheduleRetention * 60 * 60 });
    if (numEventsRemoved) {
      console.log(`[${feed.channelId}]: Cleaned up and removed ${numEventsRemoved} schedule events for channel`);
    }
  }

  private findOngoingAndFutureEvents(scheduleEvents: ScheduleEvent[], now): ScheduleEvent[] {
    return scheduleEvents.filter(scheduleEvent => {
      // debug(`  ${scheduleEvent.end_time} > ${now.valueOf()} && ${scheduleEvent.start_time} < ${now.valueOf()}`);
      if (scheduleEvent.end_time > now.valueOf() && scheduleEvent.start_time < now.valueOf()) {
        return true;
      }
      if (scheduleEvent.start_time > now.valueOf()) {
        return true;
      }
      return false;
    });
  }

  private findLastEndTime(scheduleEvents: ScheduleEvent[], now): number {
    if (scheduleEvents.length === 0) {
      return now.valueOf();
    }
    let lastEndTime = now.valueOf();
    for (let i = 0; i < scheduleEvents.length; i++) {
      if (scheduleEvents[i].end_time > lastEndTime) {
        lastEndTime = scheduleEvents[i].end_time;
      }
    }
    return lastEndTime;
  }
};