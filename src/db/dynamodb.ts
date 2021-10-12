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
  private client: AWS.DynamoDB.DocumentClient;

  constructor(db: AWS.DynamoDB) {
    this.db = db;
    this.client = new AWS.DynamoDB.DocumentClient();
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
      debug(`Scan ${tableName}`);
      this.client.scan({ TableName: tableName }, (err, data) => {
        if (err) reject(err.message);
        else {
          resolve(data.Items);
        }
      });
    });
  }

  get(tableName: string, key: AWS.DynamoDB.DocumentClient.Key) {
    return new Promise<AWS.DynamoDB.DocumentClient.GetItemOutput>((resolve, reject) => {
      this.client.get({ TableName: tableName, Key: key }, (err, data) => {
        if (err) reject(err.message);
        else {
          resolve(data);
        }
      });
    });
  }

  put(tableName: string, item: AWS.DynamoDB.DocumentClient.PutItemInputAttributeMap) {
    return new Promise<AWS.DynamoDB.DocumentClient.PutItemOutput>((resolve, reject) => {
      this.client.put({ TableName: tableName, Item: item }, (err, data) => {
        if (err) reject(err.message);
        else {
          resolve(data);
        }
      });
    });
  }

  update(params: AWS.DynamoDB.DocumentClient.UpdateItemInput) {
    return new Promise<AWS.DynamoDB.DocumentClient.UpdateItemOutput>((resolve, reject) => {
      this.client.update(params, (err, data) => {
        if (err) reject(err.message);
        else {
          resolve(data);
        }
      });
    });
  }

  delete(params: AWS.DynamoDB.DocumentClient.DeleteItemInput) {
    return new Promise<AWS.DynamoDB.DocumentClient.DeleteItemOutput>((resolve, reject) => {
      this.client.delete(params, (err, data) => {
        if (err) reject(err.message);
        else {
          resolve(data);
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

  async listChannels(tenant: string) {
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

  async addChannel(channel: Channel) {
    const data = await this.db.get(this.channelsTableName, { id: channel.id });
    if (data.Item.id) {
      throw new Error("Channel exists");
    }
    await this.db.put(this.channelsTableName, { id: channel.id });
  }

  async updateChannel(channel: Channel) {
    const params: AWS.DynamoDB.DocumentClient.UpdateItemInput = {
      TableName: this.channelsTableName,
      Key: { id: channel.id },
      UpdateExpression: "set tenant=:t, title=:n",
      ExpressionAttributeValues: {
        ":t": channel.tenant,
        ":n": channel.title,
      },
      ReturnValues: "UPDATED_NEW"
    };
    await this.db.update(params);
    return true;
  }

  async getChannelById(id: string) {
    const data = await this.db.get(this.channelsTableName, { id: id });
    return new Channel({ id: data.Item.id.S, tenant: data.Item.tenant.S, title: data.Item.title.S });
  }

  async removeChannel(id: string) {
    await this.db.delete({ TableName: this.channelsTableName, Key: { id: id } });
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
    debug(`  region=${ddbRegion}, endpoint=${ddbEndpoint}`);
    AWS.config.update({
      region: ddbRegion
    });
    const dbAdapter = new DdbAdapter(new AWS.DynamoDB({ endpoint: ddbEndpoint }));
    const db = new Db(dbAdapter, options.channelsTableName || "channels", options.schedulesTableName || "schedules");
    await db.init();

    fastify.decorate("db", db);
  } catch (error) {
    console.error(error);
  }
}

export default fp(ConnectDB);