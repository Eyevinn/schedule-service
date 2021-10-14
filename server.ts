import fastify from "fastify";
import ChannelsAPI from "./src/api/channels";
import db from "./src/db/dynamodb";
import { MRSSAutoSchedulerAPI, MRSSAutoScheduler } from "./src/auto_scheduler/mrss";

const start = async() => {
  const server = fastify();

  server.get('/', async (request, reply) => {
    return 'OK\n';
  });
  
  await server.register(db, { uri: "dynamodb://localhost:5000/eu-north-1" });
  await server.register(ChannelsAPI, { prefix: "/api/v1" });
  await server.register(MRSSAutoSchedulerAPI, { prefix: "/api/v1" });
  
  const mrssAutoScheduler = new MRSSAutoScheduler(server.db.mrssFeeds, server.db.scheduleEvents);
  await mrssAutoScheduler.bootstrap(server.db.channels);
  await mrssAutoScheduler.run();
  
  server.listen(process.env.PORT || 8080, (err, address) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    console.log(`Server listening at ${address}`);
  });  
};

start();