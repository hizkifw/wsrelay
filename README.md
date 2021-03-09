# wsrelay

Basic pub/sub websocket server following a JSONRPC-ish format.

## Running

1. Install dependencies: `yarn`
2. Run the server: `yarn start`

## Using

1. Subscribe to a topic

```json
> { "method": "subscribe", "params": [ "topicA", "topicB", "topicC" ] }
< {"id":0,"result":"Success"}
```

2. Publish to a topic

```json
> { "method": "publish", "params": [ "topicB", "Hello, world!" ] }
< {"id":0,"result":"Success"}
```

3. Receive the message

```json
< {"id":-1,"result":["topicB","Hello, world!"]}
```
