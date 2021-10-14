export interface ChannelAttrs {
  id: string;
  tenant: string;
  title: string;
}

export class Channel {
  private attrs: ChannelAttrs;

  constructor(attrs: ChannelAttrs) {
    this.attrs.id = attrs.id;
    this.attrs.tenant = attrs.tenant;
    this.attrs.title = attrs.title;
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