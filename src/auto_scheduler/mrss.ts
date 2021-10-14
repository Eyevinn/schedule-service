import { FastifyInstance, FastifyPluginAsync, FastifyPluginOptions } from "fastify";

import { MRSSFeed } from "../models/mrssFeedModel";

export const MRSSAutoSchedulerAPI: FastifyPluginAsync = async (server: FastifyInstance, options: FastifyPluginOptions) => {
  const { prefix } = options;

  server.register(async (server: FastifyInstance) => {
    server.get("/mrss", {}, async (request, reply) => {
      const tenant = request.headers["host"];
      try {
        const feeds: MRSSFeed[] = await server.db.mrssFeeds.list(tenant);;
        return reply.code(200).send(feeds);
      } catch (error) {
        request.log.error(error);
        return reply.send(500);
      }
    });  
  }, { prefix });
};

export class MRSSAutoScheduler {
  constructor({ db }) {

  }

  run() {

  }
};