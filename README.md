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
docker run --rm -p 5000:8000 amazon/dynamodb-local
```

Start the schedule service

```
DB=dynamodb://localhost:5000/eu-north-1 npm start
```

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
| `/api/v1/channels/{channelId}`| DELETE | Remove a channel (TBD) |
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
| `/api/v1/mrss` | POST | Add a new MRSS scheduler (TBD) |
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

# About Eyevinn Technology

Eyevinn Technology is an independent consultant firm specialized in video and streaming. Independent in a way that we are not commercially tied to any platform or technology vendor.

At Eyevinn, every software developer consultant has a dedicated budget reserved for open source development and contribution to the open source community. This give us room for innovation, team building and personal competence development. And also gives us as a company a way to contribute back to the open source community.

Want to know more about Eyevinn and how it is to work here. Contact us at work@eyevinn.se!
