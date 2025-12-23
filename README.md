# AppSync Realtime Messages Test Application

This is a reference implementation demonstrating how to use AWS AppSync for realtime messaging with Lambda authorization.

![Demo](demo/[OK]subscribed-client-can-receive-messages-same-channel.png)

## Overview

This application demonstrates:

- **Mutations**: Publishing messages via GraphQL mutations
- **Subscriptions**: Real-time message delivery via GraphQL subscriptions
- **Lambda Authorization**: Using custom Lambda authorizer for authentication
- **Two Parameter Sets**: Support for both "owner" and "client-owner" message types

## Architecture

```
┌─────────────┐         ┌─────────────┐
│   Client    │────────▶│   AppSync   │
│  (React)    │◀────────│   GraphQL   │
└─────────────┘         └─────────────┘
                              │
                              │ Lambda Authorizer
                              ▼
                        ┌─────────────┐
                        │   Lambda    │
                        │ Authorizer  │
                        └─────────────┘
```

### GraphQL Schema

```graphql
type Message {
  id: ID!
  content: String!
  sender: String!
  shareId: String!
  createdAt: AWSDateTime!
  # Optional fields
  tenantID: Int
  propertyID: Int
  orderID: Int
  constructionID: String
}

type Mutation {
  publishMessage(
    content: String!
    sender: String!
    # Option 1: Owner parameters
    shareId: String
    constructionID: String
    # Option 2: Client-owner parameters (all required together)
    tenantID: Int
    propertyID: Int
    orderID: Int
  ): Message
}

type Subscription {
  onMessage(shareId: String!): Message
    @aws_subscribe(mutations: ["publishMessage"])
}
```

### How It Works

1. **Mutation**: `publishMessage` accepts message content and sender, plus one of two parameter sets:

   - **Owner mode**: Provide `shareId` (required) and optionally `constructionID`
   - **Client-owner mode**: Provide `tenantID`, `propertyID`, `orderID` (all required). The resolver auto-generates `shareId` as `${tenantID}:${propertyID}:${orderID}`

2. **Subscription**: `onMessage(shareId)` subscribes to messages for a specific `shareId`. AppSync automatically filters messages - only messages with matching `shareId` are delivered.

3. **Authorization**: Both mutations and subscriptions require a Lambda authorization token passed in the `Authorization` header.

## Setup

### 1. Environment Variables

Create a `.env` file in the root directory:

```bash
REACT_APP_APPSYNC_ENDPOINT=https://your-api-id.appsync-api.ap-northeast-1.amazonaws.com/graphql
REACT_APP_AWS_REGION=ap-northeast-1
REACT_APP_AUTH_TOKEN=your-auth-token-here
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Run the Application

```bash
npm start

# cd to golang and run to publish message
go run main.go
```

The app will open at `http://localhost:3000`

## Usage

### Owner Mode [Verified]

1. Select "Owner Mode"
2. Enter a `shareId` (e.g., "room-1")
3. Optionally enter a `constructionID`
4. Type a message and click "Send"
5. All clients subscribed to the same `shareId` will receive the message

### Client-Owner Mode

1. Select "Client-Owner Mode"
2. Enter `tenantID`, `propertyID`, and `orderID`
3. The `shareId` will be auto-generated as `${tenantID}:${propertyID}:${orderID}`
4. Type a message and click "Send"
5. All clients subscribed to the generated `shareId` will receive the message

### Multiple Clients

Open multiple browser tabs/windows with the same `shareId` to see real-time message synchronization.

The tests verify:

- Owner mode: Publishing and receiving messages
- Client-owner mode: Auto-generation of shareId and message delivery

## Key Implementation Details

### Lambda Authorization

Both mutations and subscriptions require a token:

```javascript
const client = generateClient({
  authMode: "custom",
  authToken: getAuthToken(), // Your authorization token
});
```

The token is sent in the `Authorization` header and passed to the Lambda authorizer as `authorizationToken`.

### Subscription Filtering

AppSync automatically filters subscriptions by `shareId`. When you subscribe to `onMessage(shareId: "room-1")`, you only receive messages where `publishMessage` returns a Message with `shareId: "room-1"`.

### Message Structure

All messages return a complete `Message` object:

```typescript
{
  id: string              // Auto-generated UUID
  content: string         // Message content
  sender: string          // Sender identifier
  shareId: string         // Share/room identifier (required)
  createdAt: string       // ISO 8601 timestamp
  tenantID?: number       // Optional (client-owner mode)
  propertyID?: number     // Optional (client-owner mode)
  orderID?: number        // Optional (client-owner mode)
  constructionID?: string // Optional (owner mode)
}
```

## Troubleshooting

### Connection Issues

- Verify `REACT_APP_APPSYNC_ENDPOINT` is set correctly
- Check that the Lambda authorizer accepts your token
- Ensure WebSocket connections are not blocked by firewall/proxy

### Messages Not Received

- Verify subscription `shareId` matches the published message's `shareId`
- Check browser console for subscription errors
- Ensure the subscription is active before publishing

### Authorization Errors

- Verify `REACT_APP_AUTH_TOKEN` is set and valid
- Check Lambda authorizer logs in CloudWatch
- Ensure token format matches authorizer expectations

## References

- [AWS AppSync Documentation](https://docs.aws.amazon.com/appsync/)
- [AWS Amplify GraphQL API](https://docs.amplify.aws/react/build-a-backend/graphql-api/)
- [GraphQL Subscriptions](https://graphql.org/learn/queries/#subscriptions)
