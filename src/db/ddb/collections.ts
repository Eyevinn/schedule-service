import Debug from "debug";

import { IDbCollectionsAdapter } from "../interface";
import { DdbAdapter } from "../dynamodb";
import { Collection } from "../../models/collectionModel";

const debug = Debug("db-dynamodb");

export class DbCollections implements IDbCollectionsAdapter {
  private db: DdbAdapter;
  private collectionsTableName: string;

  constructor(db: DdbAdapter, collectionsTableName: string) {
    this.db = db;
    this.collectionsTableName = collectionsTableName;
  }

  async init() {
    await this.db.createTableIfNotExists(this.collectionsTableName, {
      KeySchema: [ { AttributeName: "id", KeyType: "HASH" }],
      AttributeDefinitions: [ { AttributeName: "id", AttributeType: "S" }]
    });
  }

  async list(tenant: string) {
    try {
      return await (await this.listAll()).filter(collection => collection.tenant === tenant);
    } catch(error) {
      console.error(error);
      return [];
    }
  }

  async listAll() {
    try {
      const items = await this.db.scan(this.collectionsTableName);
      debug(items);
      let collections: Collection[] = [];
      items.forEach(item => {
        collections.push(new Collection({
          id: item.id,
          tenant: item.tenant,
        }));
      });
      return collections;
    } catch(error) {
      console.error(error);
      return [];
    }
  }

  async add(collection: Collection) {
    const data = await this.db.get(this.collectionsTableName, { "id": collection.id });
    if (data.Item && data.Item.id) {
      throw new Error("Collection exists");
    }
    await this.db.put(this.collectionsTableName, collection.item);
  }

  async getCollectionById(id: string) {
    const data = await this.db.get(this.collectionsTableName, { "id": id });
    if (data.Item) {
      return new Collection({ id: data.Item.id, tenant: data.Item.tenant });
    } else {
      return null;
    }
  }

  async remove(id: string) {
    await this.db.delete({ TableName: this.collectionsTableName, Key: { "id": id } });
  }
}
