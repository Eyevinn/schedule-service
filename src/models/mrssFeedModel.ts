export interface MRSSFeedAttr {
  id: string;
  tenant: string;
  url: string;
  channelId: string;
}

export class MRSSFeed {
  private attrs: MRSSFeedAttr;

  constructor(attrs: MRSSFeedAttr) {
    this.attrs.id = attrs.id;
    this.attrs.tenant = attrs.tenant;
    this.attrs.url = attrs.url;
    this.attrs.channelId = attrs.channelId;
  }

  get id() {
    return this.attrs.id;
  }

  get tenant() {
    return this.attrs.tenant;
  }

  get url() {
    return this.attrs.url;
  }

  get channelId() {
    return this.attrs.channelId;
  }
}