import fastify from "fastify";
import fastifySwagger from "fastify-swagger";

import { version } from "./package.json";
import ChannelsAPI from "./src/api/channels";
import RedirectPlugin, { RedirectPluginOptions } from "./src/api/redirect";
import db from "./src/db/dynamodb";
import { MRSSAutoSchedulerAPI, MRSSAutoScheduler } from "./src/auto_scheduler/mrss";
import { PlaylistAutoSchedulerAPI, PlaylistAutoScheduler } from "./src/auto_scheduler/playlist";

const dbUrl = process.env.DB || "dynamodb://aws/" + process.env.AWS_REGION;
const dbTablePrefix = process.env.DB_TABLE_PREFIX || "local";

const start = async() => {
  const server = fastify({ ignoreTrailingSlash: true });

  server.get('/', async () => {
    return 'OK\n';
  });
  
  await server.register(fastifySwagger, {
    routePrefix: "/api/docs",
    swagger: {
      info: {
        title: "Eyevinn Schedule Service API",
        version: version,
      }
    },
    exposeRoute: true,
  });
  await server.register(db, { 
    uri: dbUrl,
    channelsTableName: dbTablePrefix + "_channels",
    schedulesTableName: dbTablePrefix + "_schedules",
    mrssFeedsTableName: dbTablePrefix + "_mrssFeeds",
    playlistsTableName: dbTablePrefix + "_playlists",
  });
  await server.register(ChannelsAPI, { prefix: "/api/v1" });
  await server.register(MRSSAutoSchedulerAPI, { prefix: "/api/v1/auto" });
  await server.register(PlaylistAutoSchedulerAPI, { prefix: "/api/v1/auto" });
  const redirectOptions: RedirectPluginOptions = {
    source: "/api/v1/mrss", destination: "/api/v1/auto/mrss"
  }
  await server.register(RedirectPlugin, redirectOptions);
  
  const mrssAutoScheduler = new MRSSAutoScheduler(server.db.mrssFeeds, server.db.scheduleEvents, server.db.channels);
  await mrssAutoScheduler.bootstrap(process.env.DEMO_TENANT || "demo");
  await mrssAutoScheduler.run();

  const playlistAutoScheduler = new PlaylistAutoScheduler(server.db.playlists, server.db.scheduleEvents, server.db.channels)
  await playlistAutoScheduler.bootstrap(process.env.DEMO_TENANT || "demo");
  await playlistAutoScheduler.run();
  
  server.listen(process.env.PORT || 8080, process.env.IF || "0.0.0.0", (err, address) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    console.log(`Server listening at ${address}`);
  });  
};

start();
