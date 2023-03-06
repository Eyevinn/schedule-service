import { FastifyInstance, FastifyPluginAsync, FastifyPluginOptions } from "fastify";
import fp from "fastify-plugin";
import { DynamoDB, config } from "aws-sdk";
import Debug from "debug";
import { IDbPluginOptions } from "./interface";
import { DbChannels, DbScheduleEvents } from "./ddb/channels";
import { DbMRSSFeeds, DbPlaylists } from "./ddb/auto_schedulers";
import { DbCollections } from "./ddb/collections";

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

export class DdbAdapter {
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
    const dbPlaylists = new DbPlaylists(dbAdapter, options.playlistsTableName || "playlists");
    await dbPlaylists.init();
    const dbCollections = new DbCollections(dbAdapter, options.collectionsTableName || "collections");
    await dbCollections.init();

    fastify.decorate("db", { channels: dbChannels, 
      scheduleEvents: dbScheduleEvents, 
      mrssFeeds: dbMRSSFeeds, 
      playlists: dbPlaylists 
    });
  } catch (error) {
    console.error(error);
  }
}

export default fp(ConnectDB);