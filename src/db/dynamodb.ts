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

  constructor(db: DynamoDB, endpoint?: string) {
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
      debug(`Scan ${tableName}: ${filter ? JSON.stringify(filter) : "ALL" }`);
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
      return await (await this.listAll()).filter(channel => channel.tenant === tenant);
    } catch(error) {
      console.error(error);
      return [];
    }
  }

  async listAll() {
    try {
      const items = await this.db.scan(this.channelsTableName);
      debug(items);
      let channels: Channel[] = [];
      items.forEach(item => {
        channels.push(new Channel({
          id: item.id,
          tenant: item.tenant,
          title: item.title,
          audioTracks: item.audioTracks,
        }));
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
        type: item.type,
        liveUrl: item.liveUrl,
      }));
    });
    const sortedScheduleEvents = scheduleEvents.sort((a, b) => a.start_time - b.start_time);
    return sortedScheduleEvents;
  }

  async remove(id: string) {
    let query;
    try {
      query = { TableName: this.schedulesTableName, Key: { "id": id } };
      await this.db.delete(query);
    } catch (error) {
      console.error(`Failed to delete schedule with ID ${id}`);
      debug(query);
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
      eventsToRemove = eventsToRemove.concat(items.map(item => item.id));
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
      debug(`Removed ${numEntriesRemoved} schedule events`);
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

    if (rangeOpts.age) {
      filter = {
        ProjectExpression: "#e, channelId",
        FilterExpression: "#e <= :end AND channelId = :chId",
        ExpressionAttributeNames: { "#e": "end_time" },
        ExpressionAttributeValues: {
          ":chId": channelId,
          ":end": dayjs().subtract(rangeOpts.age, "second").valueOf(),
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
        config: item.config,
      }));
    } catch (error) {
      console.error(error);
      return [];
    }
  }

  async getMRSSFeedById(id: string) {
    try {
      const data = await this.db.get(this.mrssFeedsTableName, { "id": id });
      if (data.Item) {
        return new MRSSFeed({ 
          id: data.Item.id, 
          tenant: data.Item.tenant, 
          url: data.Item.url,
          channelId: data.Item.channelId,
          config: data.Item.config
        });
      } else {
        return null;
      }
    } catch (error) {
      console.error(error);
      return null;
    }
  }

  async getMRSSFeedsByChannelId(channelId: string) {
    try {
      return await (await this.listAll()).filter(feed => feed.channelId === channelId);
    } catch (error) {
      console.error(error);
      return [];
    }
  }

  async add(mrssFeed: MRSSFeed) {
    await this.db.put(this.mrssFeedsTableName, mrssFeed.item);
    return mrssFeed;
  }

  async remove(id: string) {
    await this.db.delete({ TableName: this.mrssFeedsTableName, Key: { "id": id } });
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
    let dbAdapter;
    if (dbUrl.host !== "aws") {
      debug("  using custom endpoint for DynamoDB");
      dbAdapter = new DdbAdapter(new DynamoDB({ endpoint: ddbEndpoint }), ddbEndpoint);
    } else {
      dbAdapter = new DdbAdapter(new DynamoDB());
    }
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