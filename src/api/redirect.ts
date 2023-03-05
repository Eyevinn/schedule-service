import { FastifyInstance, FastifyPluginAsync, FastifyPluginOptions } from "fastify";
import fp from "fastify-plugin";

export interface RedirectPluginOptions extends FastifyPluginOptions {
  source: string;
  destination: string;
}

const RedirectPlugin: FastifyPluginAsync = async (fastify: FastifyInstance, options: RedirectPluginOptions) => {
  const {
    source, 
    destination
  } = options;

  fastify.addHook("onRequest", async (request, reply) => {
    console.log(request.url);
    if (request.url === source) {
      reply.redirect(301, destination);
    }
  });
};

export default fp(RedirectPlugin);