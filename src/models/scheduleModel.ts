export interface ScheduleEventAttrs {
  id: string;
  channelId: string;
  title: string;
  start_time: number;
  end_time: number;
  start?: string;
  end?: string;
  uri: string;
  duration: number;
}

export interface ScheduleRangeOptions {
  date?: string;
  start?: number;
  end?: number;
}

export class ScheduleEvent {
  private attrs: ScheduleEventAttrs;

  constructor(attrs: ScheduleEventAttrs) {
    this.attrs.id = attrs.id;
    this.attrs.channelId = attrs.channelId;
    this.attrs.title = attrs.title;
    this.attrs.start_time = attrs.start_time;
    this.attrs.end_time = attrs.end_time;
    this.attrs.start = new Date(attrs.start_time).toISOString();
    this.attrs.end = new Date(attrs.end_time).toISOString();
    this.attrs.uri = attrs.uri;
    this.attrs.duration = attrs.duration;
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
      uri: this.attrs.uri,
      duration: this.attrs.duration,
    }
  }

  get id() {
    return this.attrs.id;
  }

  set title(title: string) {
    this.attrs.title = title;
  }

  set uri(uri: string) {
    this.attrs.uri = uri;
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