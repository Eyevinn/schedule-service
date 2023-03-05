# Eyevinn Schedule Service

A modular service to automatically populate schedules.

## Installation

The services uses AWS DynamoDB as database store. To run AWS DynamoDB locally you need Docker installed.

```
npm install
npm run build
```

## Usage (local DynamoDB)

Start a local instance of DynamoDB with this command:

```
docker run --rm -p 5050:8000 amazon/dynamodb-local
```

Start the schedule service

```
DB=dynamodb://localhost:5050/eu-north-1 npm start
```

Generate channels using the Eyevinn FAST Engine container.

```
docker run --rm -p 8000:8000 -p 8001:8001 \
  -e FAST_PLUGIN=ScheduleService \
  -e SCHEDULE_SERVICE_API_URL=http://host.docker.internal:8080/api/v1 \
  eyevinntechnology/fast-engine
```

Then you have the channels available at `http://localhost:8000/channels/<channelId>/master.m3u8` or address your browser to the multiview page at `http://localhost:8001/`

## Docker

Run schedule service and dynamodb container locally

```
AWS_ACCESS_KEY_ID=null AWS_SECRET_ACCESS_KEY=null docker-compose up
```

# API

Once up and running the service is by default available on port `8080` unless otherwise specified. Access the API documentation at `http://localhost:8080/api/docs/` (when running locally).

| ENDPOINT | METHOD | DESCRIPTION |
| -------- | ------ | ----------- |
| `/api/docs/` | GET | API documentation (Swagger) |
| `/api/v1/channels`| GET | List available channels |
| `/api/v1/channels`| POST | Create a new channel |
| `/api/v1/channels/{channelId}`| DELETE | Remove a channel |
| `/api/v1/channels/{channelId}/schedule`| GET | Obtain the schedule for a channel |

## Example

```
curl -v http://localhost:8080/api/v1/channels/eyevinn/schedule?date=2021-10-21
```

Response:
```
[
  {
    "id": "e30d8b8b-cd07-4319-8bbc-a16de193697b",
    "channelId": "eyevinn",
    "title": "BAAHUBALI_3_Trailer_2021",
    "start_time": 1634844294614,
    "end_time": 1634844478614,
    "start": "2021-10-21T19:24:54.614Z",
    "end": "2021-10-21T19:27:58.614Z",
    "url": "http://lambda.eyevinn.technology/stitch/master.m3u8?payload=eyJ1cmkiOiJodHRwczovL2xhYi5jZG4uZXlldmlubi50ZWNobm9sb2d5L0JBQUhVQkFMSV8zX1RyYWlsZXJfMjAyMS5tcDQvbWFuaWZlc3QubTN1OCIsImJyZWFrcyI6W3sicG9zIjowLCJkdXJhdGlvbiI6MTA1MDAwLCJ1cmwiOiJodHRwczovL21haXR2LXZvZC5sYWIuZXlldmlubi50ZWNobm9sb2d5L1ZJTk4ubXA0L21hc3Rlci5tM3U4In1dfQ==",
    "duration": 184
  },
  {
    "id": "c3ddfa54-89d3-4842-be2b-4b818ace2f14",
    "channelId": "eyevinn",
    "title": "OWL_MVP_2021",
    "start_time": 1634844982614,
    "end_time": 1634845220614,
    "start": "2021-10-21T19:36:22.614Z",
    "end": "2021-10-21T19:40:20.614Z",
    "url": "http://lambda.eyevinn.technology/stitch/master.m3u8?payload=eyJ1cmkiOiJodHRwczovL2xhYi5jZG4uZXlldmlubi50ZWNobm9sb2d5L09XTF9NVlBfMjAyMS5tcDQvbWFuaWZlc3QubTN1OCIsImJyZWFrcyI6W3sicG9zIjowLCJkdXJhdGlvbiI6MTA1MDAwLCJ1cmwiOiJodHRwczovL21haXR2LXZvZC5sYWIuZXlldmlubi50ZWNobm9sb2d5L1ZJTk4ubXA0L21hc3Rlci5tM3U4In1dfQ==",
    "duration": 238
  }
]
```

# Modules

## MRSS Auto Scheduler

The MRSS auto scheduler automatically adds new schedule events on a channel based on the contents of an MRSS feed. The content is randomly chosen and added to the channel's schedule.

| ENDPOINT | METHOD | DESCRIPTION |
| -------- | ------ | ----------- |
| `/api/v1/mrss` | GET | List of running MRSS schedulers |
| `/api/v1/mrss` | POST | Add a new MRSS scheduler (channel must exist) |
| `/api/v1/mrss` | DELETE | Remove an MRSS scheduler but keeping the channel |

### Example

```
curl -v http://localhost:8080/api/v1/mrss
```

Response:

```
[
  {
    "id": "eyevinn",
    "tenant": "demo",
    "url": "https://testcontent.mrss.eyevinn.technology/eyevinn.mrss?preroll=true",
    "channelId": "eyevinn"
  }
]
```

## Playlist Auto Scheduler

The Playlist auto scheduler automatically adds new schedule events on a channel based on the contents
of a playlist text file. The playlist text file contains a list of URLs to HLS VODs where each URL
is on a single line. The content is added in the order of the playlist and when end of the playlist
is reached it starts from the top again.

| ENDPOINT | METHOD | DESCRIPTION |
| -------- | ------ | ----------- |
| `/api/v1/playlist` | GET | List of running Playlist schedulers |
| `/api/v1/playlist` | POST | Add a new Playlist scheduler (channel must exist) |
| `/api/v1/playlist` | DELETE | Remove an Playlist scheduler but keeping the channel |


## Support

Join our [community on Slack](http://slack.streamingtech.se) where you can post any questions regarding any of our open source projects. Eyevinn's consulting business can also offer you:

- Further development of this component
- Customization and integration of this component into your platform
- Support and maintenance agreement

Contact [sales@eyevinn.se](mailto:sales@eyevinn.se) if you are interested.

## About Eyevinn Technology

[Eyevinn Technology](https://www.eyevinntechnology.se) is an independent consultant firm specialized in video and streaming. Independent in a way that we are not commercially tied to any platform or technology vendor. As our way to innovate and push the industry forward we develop proof-of-concepts and tools. The things we learn and the code we write we share with the industry in [blogs](https://dev.to/video) and by open sourcing the code we have written.

Want to know more about Eyevinn and how it is to work here. Contact us at work@eyevinn.se!