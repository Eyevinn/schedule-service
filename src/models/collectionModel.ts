import { Type, Static } from '@sinclair/typebox'

export interface CollectionAttrs {
  id: string;
  tenant: string;
}

export const CollectionSchema = Type.Object({
  id: Type.String(),
  tenant: Type.String(),
});
export type TCollection = Static<typeof CollectionSchema>;

export class Collection {
  private attrs: CollectionAttrs;

  public static schema = CollectionSchema;

  constructor(attrs: CollectionAttrs) {
    this.attrs = {
      id: attrs.id,
      tenant: attrs.tenant,
    };
  }

  get item(): CollectionAttrs {
    return {
      id: this.attrs.id,
      tenant: this.attrs.tenant,
    };
  }

  get id() {
    return this.attrs.id;
  }

  get tenant() {
    return this.attrs.tenant;
  }
}
