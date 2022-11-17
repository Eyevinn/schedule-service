import Debug from "debug";
import { FastifyInstance, FastifyPluginAsync, FastifyPluginOptions } from "fastify";
import fp from "fastify-plugin";
import dayjs from "dayjs";

import { Channel, TChannel } from "../models/channelModel";
import { ScheduleEvent, TScheduleEvent, ScheduleRangeOptions } from "../models/scheduleModel";
import { Type } from "@sinclair/typebox";

const debug = Debug("api-channels");

interface IAPIChannelParams {
  channelId: string;
}

interface IAPIScheduleParams {
  channelId: string;
}

interface IAPIScheduleQuery {
  date: string;
  start: string;
  end: string;
}

const ChannelsAPI: FastifyPluginAsync = async (fastify: FastifyInstance, options: FastifyPluginOptions) => {
  const { prefix } = options;

  fastify.register(async (server: FastifyInstance) => {
    server.get<{ Reply: TChannel[] }>("/channels", {
      schema: {
        description: "Get a list of all available channels (tenant specific)",
        response: {
          200: Type.Array(Channel.schema)
        }
      }
    }, async (request, reply) => {
      const tenant = request.headers["host"];
      try {
        if (tenant.match(/^localhost/)) {
          const channels: Channel[] = await server.db.channels.listAll();
          return reply.code(200).send(channels);
        } else {
          request.log.info(`Listing channels for tenant '${tenant}'`);
          const channels: Channel[] = await server.db.channels.list(tenant);
          return reply.code(200).send(channels);
        }
      } catch (error) {
        request.log.error(error);
        return reply.code(500);
      }
    });

    server.post<{ Body: TChannel, Reply: TChannel|string }>(
      "/channels", 
      {
        schema: {
          description: "Add a new channel (tenant specific)",
          body: Channel.schema,
          response: {
            200: Channel.schema,
            400: Type.String(),
            500: Type.String()
          }
        } 
      }, async (request, reply) => {
        const tenant = request.headers["host"];
        try {
          if (request.body.tenant !== tenant) {
            return reply.code(400).send(`Expected tenant to be ${tenant}`);
          }
          let channel = await server.db.channels.getChannelById(request.body.id);
          if (channel) {
            return reply.code(400).send(`Channel with ID ${request.body.id} already exists`);
          }
          channel = new Channel(request.body);
          await server.db.channels.add(channel);
          return reply.code(200).send(channel.item);
        } catch (error) {
          request.log.error(error);
          return reply.code(500).send(error);
        }
      });

    server.delete<{
      Params: IAPIChannelParams, Reply: string
    }>("/channels/:channelId", {
      schema: {
        description: "Remove channel and any associated auto-scheduler with this channel",
        params: {
          channelId: Type.String({ description: "The ID for the channel" })
        },
        response: {
          204: Type.String(),
          400: Type.String()
        }
      }
    }, async (request, reply) => {
      try {
        const channel = await server.db.channels.getChannelById(request.params.channelId);
        if (!channel) {
          return reply.code(400).send(`Channel with ID ${request.params.channelId} does not exist`);
        }
        const mrssFeeds = await server.db.mrssFeeds.getMRSSFeedsByChannelId(channel.id);
        for (const feed of mrssFeeds) {
          await server.db.mrssFeeds.remove(feed.id);
        }
        await server.db.channels.remove(channel.id);
        reply.code(204);
      } catch (error) {
        request.log.error(error);
        return reply.code(500);
      }
    });

    server.get<{
      Params: IAPIScheduleParams, Querystring: IAPIScheduleQuery, Reply: TScheduleEvent[]
    }>("/channels/:channelId/schedule", {
      schema: {
        description: "Get the schedule for a channel",
        params: {
          channelId: Type.String({ description: "The ID for the channel" })
        },
        querystring: {
          type: "object",
          properties: {
            date: { type: "string", example: "2021-10-19", description: "A specific date (YYYY-MM-DD)" },
            start: { type: "string", description: "Start of range in UTC time ISO8601 (YYYY-MM-DDTHH:mm:ssZ)"},
            end: { type: "string", description: "End of range in UTC time ISO8601 (YYYY-MM-DDTHH:mm:ssZ)"},
          }
        },
        response: {
          200: Type.Array(ScheduleEvent.schema)
        }
      }
    }, async (request, reply) => {
      try {
        const { channelId } = request.params;
        const { date, start, end } = request.query;

        let rangeOpts: ScheduleRangeOptions = {};
        if (date) {
          rangeOpts.date = date;
        } else {
          if (start) {
            rangeOpts.start = dayjs(start).valueOf();
          }
          if (end) {
            rangeOpts.end = dayjs(end).valueOf();
          }
        }
        const scheduleEvents: ScheduleEvent[] = 
          await server.db.scheduleEvents
          .getScheduleEventsByChannelId(channelId, rangeOpts);
        return reply.code(200).send(scheduleEvents);
      } catch (error) {
        request.log.error(error);
        return reply.code(500);
      }
    });
  }, { prefix });
};

export default fp(ChannelsAPI);