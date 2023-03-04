import { Type, Static } from '@sinclair/typebox'

interface IChannelAudioTrack {
  language: string;
  name: string;
  default: boolean;
}

export interface ChannelAttrs {
  id: string;
  tenant: string;
  title: string;
  audioTracks?: IChannelAudioTrack[];
}

export const ChannelSchema = Type.Object({
  id: Type.String(),
  tenant: Type.String(),
  title: Type.String(),
  audioTracks: Type.Optional(Type.Array(Type.Object({
    language: Type.String(),
    name: Type.String(),
    default: Type.Boolean()
  })))
});
export type TChannel = Static<typeof ChannelSchema>;

export class Channel {
  private attrs: ChannelAttrs;

  public static schema = ChannelSchema;

  constructor(attrs: ChannelAttrs) {
    this.attrs = {
      id: attrs.id,
      tenant: attrs.tenant,
      title: attrs.title,
      audioTracks: attrs.audioTracks,
    };
  }

  get item(): ChannelAttrs {
    return {
      id: this.attrs.id,
      tenant: this.attrs.tenant,
      title: this.attrs.title,
      audioTracks: this.attrs.audioTracks,
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

  get audioTracks() {
    return this.attrs.audioTracks;
  }
}