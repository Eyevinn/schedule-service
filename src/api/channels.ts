import Debug from "debug";
import { FastifyInstance, FastifyPluginAsync, FastifyPluginOptions } from "fastify";
import fp from "fastify-plugin";
import dayjs from "dayjs";

import { Channel } from "../models/channelModel";
import { ScheduleEvent, ScheduleRangeOptions } from "../models/scheduleModel";

const debug = Debug("api-channels");

interface IAPIScheduleParams {
  channelId: string;
}

interface IAPIScheduleQuery {
  date: string;
  start: string;
  end: string;
}

const ChannelsAPI: FastifyPluginAsync = async (fastify: FastifyInstance, options: FastifyPluginOptions) => {
  const { prefix } = options;

  fastify.register(async (server: FastifyInstance) => {
    server.get("/channels", {
      schema: {
        description: "Get a list of all available channels (tenant specific)",
        response: {
          200: { type: "array", items: Channel.schema }
        }
      }
    }, async (request, reply) => {
      const tenant = request.headers["host"];
      try {
        if (tenant.match(/^localhost/)) {
          const channels: Channel[] = await server.db.channels.listAll();
          return reply.code(200).send(channels);
        } else {
          const channels: Channel[] = await server.db.channels.list(tenant);
          return reply.code(200).send(channels);
        }
      } catch (error) {
        request.log.error(error);
        return reply.send(500);
      }
    });
    
    server.get<{
      Params: IAPIScheduleParams, Querystring: IAPIScheduleQuery
    }>("/channels/:channelId/schedule", {
      schema: {
        description: "Get the schedule for a channel",
        params: {
          channelId: {
            type: "string",
            description: "The ID for the channel",
          }
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
          200: { type: "array", items: ScheduleEvent.schema }
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
        debug(scheduleEvents);
        return reply.code(200).send(scheduleEvents);
      } catch (error) {
        request.log.error(error);
        return reply.send(500);
      }
    });
  }, { prefix });
};

export default fp(ChannelsAPI);