import Debug from "debug";
import { FastifyInstance, FastifyPluginAsync, FastifyPluginOptions } from "fastify";
import { IDbPluginOptions } from "./interface";
import fp from "fastify-plugin";

const debug = Debug("db-couchdb");

class CouchdbAdapter {
}

const ConnectDB: FastifyPluginAsync<IDbPluginOptions> = async (
  fastify: FastifyInstance,
  options: FastifyPluginOptions
) => {
  try {
    debug(`Connecting to CouchDB on ${options.uri}`);
  } catch (error) {
    console.error(error);
  }
}

export default fp(ConnectDB);