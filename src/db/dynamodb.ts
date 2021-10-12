import { FastifyInstance, FastifyPluginAsync, FastifyPluginOptions } from "fastify";
import fp from "fastify-plugin";
import AWS from "aws-sdk";
import Debug from "debug";
import { IDbPluginOptions, IDbAdapter } from "./interface";
import { Channel, ChannelAttrs } from "../models/channelModel";

const debug = Debug("db-dynamodb");

interface IDDbKeySchema {
  AttributeName: string;
  KeyType: string;
}

interface IDDbAttributeDefinitions {
  AttributeName: string;
  AttributeType: string;
}

interface IDDbTableSchema {
  KeySchema: IDDbKeySchema[];
  AttributeDefinitions: IDDbAttributeDefinitions[];
}

class DdbAdapter {
  private db: AWS.DynamoDB;

  constructor(db: AWS.DynamoDB) {
    this.db = db;
  }

  listTables() {
    return new Promise<AWS.DynamoDB.TableNameList>((resolve, reject) => {
      this.db.listTables((err, data) => {
        if (err) reject(err.message);
        else resolve(data.TableNames);
      });
    });  
  }

  createTableIfNotExists(tableName: string, schema: IDDbTableSchema) {
    return new Promise<string>((resolve, reject) => {
      this.listTables().then(tables => {
        if (tables.includes(tableName)) {
          resolve(tableName);
        } else {
          const params = {
            TableName: tableName,
            ProvisionedThroughput: {
              ReadCapacityUnits: 3,
              WriteCapacityUnits: 3
            },
            ...schema,
          };
          this.db.createTable(params, (err, data) => {
            if (err) reject(err.message);
            else {
              debug(`Table ${tableName} created`);
              resolve(tableName);
            }
          });
        }
      });
    });    
  }

  scan(tableName: string) {
    return new Promise<AWS.DynamoDB.ItemList>((resolve, reject) => {
      this.db.scan({ TableName: tableName }, (err, data) => {
        if (err) reject(err.message);
        else {
          resolve(data.Items);
        }
      });
    });
  }
}

class Db implements IDbAdapter {
  private db: DdbAdapter;
  private channelsTableName: string;
  private schedulesTableName: string;

  constructor(db: DdbAdapter, channelsTableName: string, schedulesTableName: string) {
    this.db = db;
    this.channelsTableName = channelsTableName;
    this.schedulesTableName = this.schedulesTableName;
  }

  async init() {
    await this.db.createTableIfNotExists(this.channelsTableName, {
      KeySchema: [ { AttributeName: "id", KeyType: "HASH" }],
      AttributeDefinitions: [ { AttributeName: "id", AttributeType: "S" }]
    });
    await this.db.createTableIfNotExists(this.schedulesTableName || "schedules", {
      KeySchema: [ { AttributeName: "eventId", KeyType: "HASH" }],
      AttributeDefinitions: [ { AttributeName: "eventId", AttributeType: "S" }]
    });
  }

  async listChannels() {
    try {
      const items = await this.db.scan(this.channelsTableName);
      let channels: Channel[] = [];
      items.forEach(item => {
        channels.push(new Channel({
          id: item.id.S,
          tenant: item.tenant.S,
          title: item.title.S,
         }));
      });
      return channels;
    } catch(error) {
      console.error(error);
      return [];
    }
  }
}

const ConnectDB: FastifyPluginAsync<IDbPluginOptions> = async (
  fastify: FastifyInstance,
  options: FastifyPluginOptions
) => {
  try {
    debug(`Connecting to DynamoDB on ${options.uri}`);
    const dbUrl = new URL(options.uri);
    const ddbEndpoint: string = `http://${dbUrl.host}`;
    const ddbRegion = dbUrl.pathname.slice(1);
    const dbAdapter = new DdbAdapter(new AWS.DynamoDB({ endpoint: ddbEndpoint, region: ddbRegion }));
    const db = new Db(dbAdapter, options.channelsTableName || "channels", options.schedulesTableName || "schedules");

    fastify.decorate('db', db);
  } catch (error) {
    console.error(error);
  }
}

export default fp(ConnectDB);