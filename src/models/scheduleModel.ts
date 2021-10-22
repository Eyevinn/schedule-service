import { Type } from '@sinclair/typebox'

export interface ScheduleEventAttrs {
  id: string;
  channelId: string;
  title: string;
  start_time: number;
  end_time: number;
  start?: string;
  end?: string;
  url: string;
  duration: number;
}

export interface ScheduleRangeOptions {
  date?: string;
  start?: number;
  end?: number;
  age?: number;
}

export class ScheduleEvent {
  private attrs: ScheduleEventAttrs;

  public static schema = Type.Object({
    id: Type.String(),
    channelId: Type.String(),
    title: Type.String(),
    start_time: Type.Number(),
    end_time: Type.Number(),
    start: Type.String(),
    end: Type.String(),
    url: Type.String(),
    duration: Type.Number(),
  });

  constructor(attrs: ScheduleEventAttrs) {
    this.attrs = {
      id: attrs.id,
      channelId: attrs.channelId,
      title: attrs.title,
      start_time: attrs.start_time,
      end_time: attrs.end_time,
      start: new Date(attrs.start_time).toISOString(),
      end: new Date(attrs.end_time).toISOString(),
      url: attrs.url,
      duration: attrs.duration,
    };
  }

  get item(): ScheduleEventAttrs {
    return {
      id: this.attrs.id,
      channelId: this.attrs.channelId,
      title: this.attrs.title,
      start_time: this.attrs.start_time,
      end_time: this.attrs.end_time,
      start: new Date(this.attrs.start_time).toISOString(),
      end: new Date(this.attrs.end_time).toISOString(),
      url: this.attrs.url,
      duration: this.attrs.duration,
    }
  }

  get id() {
    return this.attrs.id;
  }

  get channelId() {
    return this.attrs.channelId;
  }

  get title() {
    return this.attrs.title;
  }

  get start_time() {
    return this.attrs.start_time;
  }

  get end_time() {
    return this.attrs.end_time;
  }

  get start() {
    return new Date(this.attrs.start_time).toISOString();
  }

  get end() {
    return new Date(this.attrs.end_time).toISOString();
  }

  get url() {
    return this.attrs.url;
  }

  get duration() {
    return this.attrs.duration;
  }

  set title(title: string) {
    this.attrs.title = title;
  }

  set url(url: string) {
    this.attrs.url = url;
  }

  set start_time(start_time: number) {
    this.attrs.start_time = start_time;
  }

  set end_time(end_time: number) {
    this.attrs.end_time = end_time;
  }

  set duration(duration: number) {
    this.attrs.duration = duration;
  }
}