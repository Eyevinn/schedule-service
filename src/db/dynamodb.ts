import { FastifyInstance, FastifyPluginAsync, FastifyPluginOptions } from "fastify";
import fp from "fastify-plugin";
import { DynamoDB, config } from "aws-sdk";
import dayjs from "dayjs";
import Debug from "debug";
import { IDbPluginOptions, IDbChannelsAdapter, IDbScheduleEventsAdapter, IDbMRSSFeedsAdapter } from "./interface";
import { Channel } from "../models/channelModel";
import { ScheduleEvent, ScheduleRangeOptions } from "../models/scheduleModel";
import { MRSSFeed } from "../models/mrssFeedModel";

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
  private db: DynamoDB;
  private client: DynamoDB.DocumentClient;

  constructor(db: DynamoDB, endpoint: string) {
    this.db = db;
    this.client = new DynamoDB.DocumentClient({ endpoint: endpoint });
  }

  listTables() {
    return new Promise<DynamoDB.TableNameList>((resolve, reject) => {
      this.db.listTables((err, data) => {
        if (err) {
          debug(err);
          reject(err.message);
        } else {
          resolve(data.TableNames);
        }
      });
    });  
  }

  createTableIfNotExists(tableName: string, schema: IDDbTableSchema) {
    return new Promise<string>((resolve, reject) => {
      this.listTables().then(tables => {
        if (tables.includes(tableName)) {
          debug(`Table ${tableName} already exists`);
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
            if (err) {
              debug(err);
              reject(err.message);
            } else {
              debug(`Table ${tableName} created`);
              resolve(tableName);
            }
          });
        }
      });
    });    
  }

  scan(tableName: string, filter?: any) {
    return new Promise<any[]>((resolve, reject) => {
      debug(`Scan ${tableName}`);
      let params: DynamoDB.ScanInput = {
        TableName: tableName,
      };
      if (filter) {
        params = {
          ...params,
          ...filter
        };
      }
      let items = [];
      const onScanDelegate = (err, data) => {
        if (err) {
          debug(err);
          reject(err.message);
        } else {
          items = items.concat(data.Items);
          if (typeof data.LastEvaluatedKey != "undefined") {
            params.ExclusiveStartKey = data.LastEvaluatedKey;
            this.client.scan(params, onScanDelegate);
          } else {
            resolve(items);
          }
        }
      };
      this.client.scan(params, onScanDelegate);
    });
  }

  get(tableName: string, key: DynamoDB.DocumentClient.Key) {
    return new Promise<DynamoDB.DocumentClient.GetItemOutput>((resolve, reject) => {
      this.client.get({ TableName: tableName, Key: key }, (err, data) => {
        if (err) {
          debug(err);
          reject(err.message);
        } else {
          resolve(data);
        }
      });
    });
  }

  put(tableName: string, item: DynamoDB.DocumentClient.PutItemInputAttributeMap) {
    return new Promise<DynamoDB.DocumentClient.PutItemOutput>((resolve, reject) => {
      this.client.put({ TableName: tableName, Item: item }, (err, data) => {
        if (err) {
          debug(err);
          reject(err.message);
        } else {
          resolve(data);
        }
      });
    });
  }

  update(params: DynamoDB.DocumentClient.UpdateItemInput) {
    return new Promise<DynamoDB.DocumentClient.UpdateItemOutput>((resolve, reject) => {
      this.client.update(params, (err, data) => {
        if (err) {
          debug(err);
          reject(err.message);
        } else {
          resolve(data);
        }
      });
    });
  }

  delete(params: DynamoDB.DocumentClient.DeleteItemInput) {
    return new Promise<DynamoDB.DocumentClient.DeleteItemOutput>((resolve, reject) => {
      this.client.delete(params, (err, data) => {
        if (err) {
          debug(err);
          reject(err.message);
        } else {
          resolve(data);
        }
      });
    });
  }
}

// ******************************************************************** //

class DbChannels implements IDbChannelsAdapter {
  private db: DdbAdapter;
  private channelsTableName: string;

  constructor(db: DdbAdapter, channelsTableName: string) {
    this.db = db;
    this.channelsTableName = channelsTableName;
  }

  async init() {
    await this.db.createTableIfNotExists(this.channelsTableName, {
      KeySchema: [ { AttributeName: "id", KeyType: "HASH" }],
      AttributeDefinitions: [ { AttributeName: "id", AttributeType: "S" }]
    });
  }

  async list(tenant: string) {
    try {
      const items = await this.db.scan(this.channelsTableName);
      let channels: Channel[] = [];
      items.forEach(item => {
        if (item.tenant.S === tenant) {
          channels.push(new Channel({
            id: item.id,
            tenant: item.tenant,
            title: item.title,
          }));
        }
      });
      return channels;
    } catch(error) {
      console.error(error);
      return [];
    }
  }

  async add(channel: Channel) {
    const data = await this.db.get(this.channelsTableName, { "id": channel.id });
    if (data.Item && data.Item.id) {
      throw new Error("Channel exists");
    }
    await this.db.put(this.channelsTableName, channel.item);
  }

  async update(channel: Channel) {
    const params: DynamoDB.DocumentClient.UpdateItemInput = {
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
    const data = await this.db.get(this.channelsTableName, { "id": id });
    if (data.Item) {
      return new Channel({ id: data.Item.id, tenant: data.Item.tenant, title: data.Item.title });
    } else {
      return null;
    }
  }

  async remove(id: string) {
    await this.db.delete({ TableName: this.channelsTableName, Key: { "id": id } });
  }
}

class DbScheduleEvents implements IDbScheduleEventsAdapter {
  private db: DdbAdapter;
  private schedulesTableName: string;

  constructor(db: DdbAdapter, schedulesTableName: string) {
    this.db = db;
    this.schedulesTableName = schedulesTableName;
  }

  async init() {
    await this.db.createTableIfNotExists(this.schedulesTableName, {
      KeySchema: [ { AttributeName: "id", KeyType: "HASH" }],
      AttributeDefinitions: [ { AttributeName: "id", AttributeType: "S" }]
    });
  }

  async add(scheduleEvent: ScheduleEvent) {
    await this.db.put(this.schedulesTableName, scheduleEvent.item);
    return scheduleEvent;
  }

  async getScheduleEventsByChannelId(channelId: string, rangeOpts: ScheduleRangeOptions) {
    const filter = this.rangeToFilter(channelId, rangeOpts);
    const items = await this.db.scan(this.schedulesTableName, filter);
    let scheduleEvents: ScheduleEvent[] = [];
    items.forEach(item => {
      scheduleEvents.push(new ScheduleEvent({
        id: item.id,
        channelId: item.channelId,
        title: item.title,
        start_time: parseInt(item.start_time, 10),
        end_time: parseInt(item.end_time, 10),
        url: item.url,
        duration: parseInt(item.duration, 10),
      }));
    });

    return scheduleEvents;
  }

  async remove(id: string) {
    try {
      await this.db.delete({ TableName: this.schedulesTableName, Key: { "id": id } });
    } catch (error) {
      debug(error);
      return false;
    }
    return true;
  };

  async removeScheduleEvents(channelId: string, rangeOpts: ScheduleRangeOptions) {
    const filter = this.rangeToFilter(channelId, rangeOpts);
    let eventsToRemove = [];
    let numEntriesRemoved = 0;
    try {
      const items = await this.db.scan(this.schedulesTableName, filter);
      eventsToRemove = eventsToRemove.concat(items.map(item => item.id.S));
      if (eventsToRemove.length > 0) {
        for (const eventId of eventsToRemove) {
          try {
            await this.remove(eventId);
            numEntriesRemoved++;
          } catch (err) {
            console.error(err);
          }
        }
      }
      return numEntriesRemoved;
    }catch (error) {
      console.error(error);
      throw new Error("Failed to remove schedule events " + error);
    }
  }

  private rangeToFilter(channelId: string, rangeOpts: ScheduleRangeOptions) {
    let filter: any = {
      ProjectExpression: "channelId",
      FilterExpression: "channelId = :chId",
      ExpressionAttributeValues: {
        ":chId": channelId,
      },
    };
    if (rangeOpts.date) {
      rangeOpts.start = dayjs(rangeOpts.date).valueOf();
      rangeOpts.end = dayjs(rangeOpts.date).add(1, "day").valueOf();
    }

    if (rangeOpts.start && !rangeOpts.end) {
      filter = {
        ProjectExpression: "#s, channelId",
        FilterExpression: "#s >= :start AND channelId = :chId",
        ExpressionAttributeNames: { "#s": "start_time" },
        ExpressionAttributeValues: {
          ":chId": channelId,
          ":start": rangeOpts.start,
        }
      };
    } else if (!rangeOpts.start && rangeOpts.end) {
      filter = {
        ProjectExpression: "#s, channelId",
        FilterExpression: "#s < :end AND channelId = :chId",
        ExpressionAttributeNames: { "#s": "start_time" },
        ExpressionAttributeValues: {
          ":chId": channelId,
          ":end": rangeOpts.end,
        }
      };
    } else if (rangeOpts.start && rangeOpts.end) {
      filter = {
        ProjectExpression: "#s, channelId",
        FilterExpression: "#s >= :start AND #s < :end AND channelId = :chId",
        ExpressionAttributeNames: { "#s": "start_time" },
        ExpressionAttributeValues: {
          ":chId": channelId,
          ":start": rangeOpts.start,
          ":end": rangeOpts.end,
        }
      };
    }
    return filter;
  }
}

class DbMRSSFeeds implements IDbMRSSFeedsAdapter {
  private db: DdbAdapter;
  private mrssFeedsTableName: string;

  constructor(db: DdbAdapter, mrssFeedsTableName: string) {
    this.db = db;
    this.mrssFeedsTableName = mrssFeedsTableName;
  }

  async init() {
    await this.db.createTableIfNotExists(this.mrssFeedsTableName, {
      KeySchema: [ { AttributeName: "id", KeyType: "HASH" }],
      AttributeDefinitions: [ { AttributeName: "id", AttributeType: "S" }]
    });
  }

  async list(tenant: string) {
    try {
      return await (await this.listAll()).filter(feed => feed.tenant === tenant);
    } catch(error) {
      console.error(error);
      return [];
    }
  }

  async listAll() {
    try {
      const items = await this.db.scan(this.mrssFeedsTableName);
      return items.map(item => new MRSSFeed({
        id: item.id,
        tenant: item.tenant,
        url: item.url,
        channelId: item.channelId,
      }));
    } catch (error) {
      console.error(error);
      return [];
    }
  }

  async add(mrssFeed: MRSSFeed) {
    await this.db.put(this.mrssFeedsTableName, mrssFeed.item);
    return mrssFeed;
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
    config.update({
      region: ddbRegion
    });
    const dbAdapter = new DdbAdapter(new DynamoDB({ endpoint: ddbEndpoint }), ddbEndpoint);
    const dbChannels = new DbChannels(dbAdapter, options.channelsTableName || "channels");
    await dbChannels.init();
    const dbScheduleEvents = new DbScheduleEvents(dbAdapter, options.schedulesTableName || "schedules");
    await dbScheduleEvents.init();
    const dbMRSSFeeds = new DbMRSSFeeds(dbAdapter, options.mrssFeedsTableName || "mrssFeeds");
    await dbMRSSFeeds.init();

    fastify.decorate("db", { channels: dbChannels, scheduleEvents: dbScheduleEvents, mrssFeeds: dbMRSSFeeds });
  } catch (error) {
    console.error(error);
  }
}

export default fp(ConnectDB);