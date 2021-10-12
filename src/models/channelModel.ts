export interface ChannelAttrs {
  id: string;
  tenant: string;
  title: string;
}

export class Channel {
  attrs: ChannelAttrs;

  constructor(attrs: ChannelAttrs) {
    this.attrs.id = attrs.id;
    this.attrs.tenant = attrs.tenant;
    this.attrs.title = attrs.title;
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