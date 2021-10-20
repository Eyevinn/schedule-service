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

