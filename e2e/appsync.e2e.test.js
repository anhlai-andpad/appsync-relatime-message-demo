import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/api';

global.WebSocket = require('ws');
global.fetch = require('cross-fetch');

const endpoint = process.env.APPSYNC_ENDPOINT;
const region = process.env.AWS_REGION || 'ap-northeast-1';
const authToken = process.env.AUTH_TOKEN || 'aaaa';

if (!endpoint) {
  throw new Error('APPSYNC_ENDPOINT environment variable is required');
}

Amplify.configure({
  API: {
    GraphQL: {
      endpoint,
      region,
      defaultAuthMode: 'lambda',
    },
  },
});

const client = generateClient({
  authMode: 'custom',
  authToken,
});

const SHARE_ID = 'room-1';
const SENDER = 'e2e-test-sender';

const publishDocOwner = /* GraphQL */ `
  mutation PublishMessage($content: String!, $sender: String!, $shareId: String!) {
    publishMessage(content: $content, sender: $sender, shareId: $shareId) {
      id
      content
      sender
      shareId
      createdAt
      tenantID
      propertyID
      orderID
      constructionID
    }
  }
`;

const publishDocClientOwner = /* GraphQL */ `
  mutation PublishMessage($content: String!, $sender: String!, $tenantID: Int!, $propertyID: Int!, $orderID: Int!) {
    publishMessage(content: $content, sender: $sender, tenantID: $tenantID, propertyID: $propertyID, orderID: $orderID) {
      id
      content
      sender
      shareId
      createdAt
      tenantID
      propertyID
      orderID
      constructionID
    }
  }
`;

const subscribeDoc = /* GraphQL */ `
  subscription OnMessage($shareId: String!) {
    onMessage(shareId: $shareId) {
      id
      content
      sender
      shareId
      createdAt
      tenantID
      propertyID
      orderID
      constructionID
    }
  }
`;

describe('AppSync realtime e2e', () => {
  test('owner mode: client receives message when server publishes', async () => {
    const expectedContent = 'hello from e2e (owner mode)';

    let subscription;
    let receivedMessage;

    // 1️⃣ Start subscription
    const subscriptionPromise = new Promise((resolve, reject) => {
      subscription = client
        .graphql({
          query: subscribeDoc,
          variables: { shareId: SHARE_ID },
          authMode: 'lambda',
          authToken,
        })
        .subscribe({
          next: event => {
            receivedMessage = event?.data?.onMessage;
            resolve();
          },
          error: reject,
        });
    });

    // Small delay to ensure WebSocket is connected
    await new Promise(r => setTimeout(r, 1000));

    // 2️⃣ Publish message (owner mode)
    await client.graphql({
      query: publishDocOwner,
      variables: {
        content: expectedContent,
        sender: SENDER,
        shareId: SHARE_ID,
      },
      authMode: 'lambda',
      authToken,
    });

    // 3️⃣ Wait for subscription
    await subscriptionPromise;

    // 4️⃣ Cleanup
    subscription.unsubscribe();

    // 5️⃣ Assert - receivedMessage is now a Message object
    expect(receivedMessage).toBeDefined();
    expect(receivedMessage.content).toBe(expectedContent);
    expect(receivedMessage.sender).toBe(SENDER);
    expect(receivedMessage.shareId).toBe(SHARE_ID);
    expect(receivedMessage.id).toBeDefined();
    expect(receivedMessage.createdAt).toBeDefined();
  });

  test('client-owner mode: shareId is auto-generated from tenantID:propertyID:orderID', async () => {
    const expectedContent = 'hello from e2e (client-owner mode)';
    const tenantID = 1;
    const propertyID = 2;
    const orderID = 3;
    const expectedShareId = `${tenantID}:${propertyID}:${orderID}`;

    let subscription;
    let receivedMessage;

    // 1️⃣ Start subscription with expected shareId
    const subscriptionPromise = new Promise((resolve, reject) => {
      subscription = client
        .graphql({
          query: subscribeDoc,
          variables: { shareId: expectedShareId },
          authMode: 'lambda',
          authToken,
        })
        .subscribe({
          next: event => {
            receivedMessage = event?.data?.onMessage;
            resolve();
          },
          error: reject,
        });
    });

    // Small delay to ensure WebSocket is connected
    await new Promise(r => setTimeout(r, 1000));

    // 2️⃣ Publish message (client-owner mode)
    const publishResult = await client.graphql({
      query: publishDocClientOwner,
      variables: {
        content: expectedContent,
        sender: SENDER,
        tenantID,
        propertyID,
        orderID,
      },
      authMode: 'lambda',
      authToken,
    });

    // 3️⃣ Wait for subscription
    await subscriptionPromise;

    // 4️⃣ Cleanup
    subscription.unsubscribe();

    // 5️⃣ Assert
    expect(publishResult.data?.publishMessage?.shareId).toBe(expectedShareId);
    expect(receivedMessage).toBeDefined();
    expect(receivedMessage.content).toBe(expectedContent);
    expect(receivedMessage.shareId).toBe(expectedShareId);
    expect(receivedMessage.tenantID).toBe(tenantID);
    expect(receivedMessage.propertyID).toBe(propertyID);
    expect(receivedMessage.orderID).toBe(orderID);
  });
});
