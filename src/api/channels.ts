import { FastifyInstance, FastifyPluginAsync, FastifyPluginOptions } from "fastify";
import fp from "fastify-plugin";

import { Channel } from "../models/channelModel";

const ChannelsAPI: FastifyPluginAsync = async (fastify: FastifyInstance, options: FastifyPluginOptions) => {
  const { prefix } = options;

  fastify.register(async (server: FastifyInstance) => {
    server.get("/channels", {}, async (request, reply) => {
      const tenant = request.headers["host"];
      try {
        const channels: Channel[] = await server.db.channels.list(tenant);
        return reply.code(200).send(channels);
      } catch (error) {
        request.log.error(error);
        return reply.send(500);
      }
    });  
  }, { prefix });
};

export default fp(ChannelsAPI);