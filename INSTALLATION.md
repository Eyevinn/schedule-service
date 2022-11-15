# Eyevinn Schedule Service

[![Slack](http://slack.streamingtech.se/badge.svg)](http://slack.streamingtech.se)

A modular service to automatically populate schedules.

## Run Schedule Service

The services uses AWS DynamoDB as database store.

To run the latest version of the Schedule Service with a local Dynamo DB instance.

```
docker run -d -p 5000:8000 amazon/dynamodb-local
```

```
docker run -d -p 8080:8080 \
  -e DB=dynamodb://localhost:5000/eu-north-1 \
  eyevinntechnology/schedule-service
```

Once up and running the service is by default available on port `8080` unless otherwise specified. Access the API documentation at `http://localhost:8080/api/docs/` (when running locally).

### Options

The following environment variables can be set:

- `PORT`: Which port to bind the service to.
- `IF`: Which IP to bind the service to.
- `DB`: DynamoDB endpoint.
- `DB_TABLE_PREFIX`: Dynamo DB table prefix.
- `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`: AWS credentials when running

## Support

Join our [community on Slack](http://slack.streamingtech.se) where you can post any questions regarding any of our open source projects. Eyevinn's consulting business can also offer you:

- Further development of this component
- Customization and integration of this component into your platform
- Support and maintenance agreement

Contact [sales@eyevinn.se](mailto:sales@eyevinn.se) if you are interested.

## About Eyevinn Technology

[Eyevinn Technology](https://www.eyevinntechnology.se) is an independent consultant firm specialized in video and streaming. Independent in a way that we are not commercially tied to any platform or technology vendor. As our way to innovate and push the industry forward we develop proof-of-concepts and tools. The things we learn and the code we write we share with the industry in [blogs](https://dev.to/video) and by open sourcing the code we have written.

Want to know more about Eyevinn and how it is to work here. Contact us at work@eyevinn.se!