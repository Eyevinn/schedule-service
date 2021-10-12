import fastify from "fastify";
import ChannelsAPI from "./src/api/channels";
import db from "./src/db/dynamodb";
import { MRSSAutoSchedulerAPI, MRSSAutoScheduler } from "./src/auto_scheduler/mrss";

const server = fastify();

const mrssAutoScheduler = new MRSSAutoScheduler({ db });

server.get('/', async (request, reply) => {
  return 'OK\n';
});

server.register(db, { uri: "dynamodb://localhost:5000/eu-north-1" });
server.register(ChannelsAPI, { prefix: "/api/v1" });
server.register(MRSSAutoSchedulerAPI, { prefix: "/api/v1" });

mrssAutoScheduler.run();

server.listen(process.env.PORT || 8080, (err, address) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`Server listening at ${address}`);
});
