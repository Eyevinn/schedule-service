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
}