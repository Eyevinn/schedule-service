import { IDbMRSSFeedsAdapter, IDbPlaylistsAdapter } from "../interface";
import { DdbAdapter } from "../dynamodb";
import { MRSSFeed } from "../../models/mrssFeedModel";
import { Playlist } from "../../models/playlistModel";

export class DbMRSSFeeds implements IDbMRSSFeedsAdapter {
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

export class DbPlaylists implements IDbPlaylistsAdapter {
  private db: DdbAdapter;
  private playlistsTableName: string;

  constructor(db: DdbAdapter, playlistsTableName: string) {
    this.db = db;
    this.playlistsTableName = playlistsTableName;
  }

  async init() {
    await this.db.createTableIfNotExists(this.playlistsTableName, {
      KeySchema: [ { AttributeName: "id", KeyType: "HASH" }],
      AttributeDefinitions: [ { AttributeName: "id", AttributeType: "S" }]
    });
  }

  async list(tenant: string) {
    try {
      return await (await this.listAll()).filter(pl => pl.tenant === tenant);
    } catch(error) {
      console.error(error);
      return [];
    }
  }

  async listAll() {
    try {
      const items = await this.db.scan(this.playlistsTableName);
      return items.map(item => new Playlist({
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

  async getPlaylistById(id: string) {
    try {
      const data = await this.db.get(this.playlistsTableName, { "id": id });
      if (data.Item) {
        return new Playlist({ 
          id: data.Item.id, 
          tenant: data.Item.tenant, 
          url: data.Item.url,
          channelId: data.Item.channelId,
        });
      } else {
        return null;
      }
    } catch (error) {
      console.error(error);
      return null;
    }
  }

  async add(playlist: Playlist) {
    await this.db.put(this.playlistsTableName, playlist.item);
    return playlist;
  }

  async remove(id: string) {
    await this.db.delete({ TableName: this.playlistsTableName, Key: { "id": id } });
  }
}
