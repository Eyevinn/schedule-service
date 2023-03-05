import { ScheduleEvent } from "../models/scheduleModel";

export function findOngoingAndFutureEvents(scheduleEvents: ScheduleEvent[], now): ScheduleEvent[] {
  return scheduleEvents.filter(scheduleEvent => {
    // debug(`  ${scheduleEvent.end_time} > ${now.valueOf()} && ${scheduleEvent.start_time} < ${now.valueOf()}`);
    if (scheduleEvent.end_time > now.valueOf() && scheduleEvent.start_time < now.valueOf()) {
      return true;
    }
    if (scheduleEvent.start_time > now.valueOf()) {
      return true;
    }
    return false;
  });
}

export function findLastEndTime(scheduleEvents: ScheduleEvent[], now): number {
  if (scheduleEvents.length === 0) {
    return now.valueOf();
  }
  let lastEndTime = now.valueOf();
  for (let i = 0; i < scheduleEvents.length; i++) {
    if (scheduleEvents[i].end_time > lastEndTime) {
      lastEndTime = scheduleEvents[i].end_time;
    }
  }
  return lastEndTime;
}