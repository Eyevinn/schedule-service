export class MRSSFeed {
  id: string;
  tenant: string;
  url: string;
  channelId: string;

  constructor(id: string, tenant: string, url: string, channelId: string) {
    this.id = id;
    this.tenant = tenant;
    this.url = url;
    this.channelId = channelId;
  }
}