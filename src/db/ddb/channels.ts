import Debug from "debug";
import { DynamoDB } from "aws-sdk";
import dayjs from "dayjs";

import { IDbChannelsAdapter, IDbScheduleEventsAdapter } from "../interface";
import { DdbAdapter } from "../dynamodb";
import { Channel } from "../../models/channelModel";
import { ScheduleEvent, ScheduleRangeOptions } from "../../models/scheduleModel";

const debug = Debug("db-dynamodb");

export class DbChannels implements IDbChannelsAdapter {
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

export class DbScheduleEvents implements IDbScheduleEventsAdapter {
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
