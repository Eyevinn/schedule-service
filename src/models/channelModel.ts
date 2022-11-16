import { Type, Static } from '@sinclair/typebox'

export interface ChannelAttrs {
  id: string;
  tenant: string;
  title: string;
}

export const ChannelSchema = Type.Object({
  id: Type.String(),
  tenant: Type.String(),
  title: Type.String(),
});
export type ChannelType = Static<typeof ChannelSchema>;

export class Channel {
  private attrs: ChannelAttrs;

  public static schema = ChannelSchema;

  constructor(attrs: ChannelAttrs) {
    this.attrs = {
      id: attrs.id,
      tenant: attrs.tenant,
      title: attrs.title,
    };
  }

  get item(): ChannelAttrs {
    return {
      id: this.attrs.id,
      tenant: this.attrs.tenant,
      title: this.attrs.title,
    };
  }

  get id() {
    return this.attrs.id;
  }

  get tenant() {
    return this.attrs.tenant;
  }

  get title() {
    return this.attrs.title;
  }
}