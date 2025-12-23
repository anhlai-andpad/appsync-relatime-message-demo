import { generateClient } from 'aws-amplify/api'

/**
 * 🔑 IMPORTANT:
 * Lambda authorizer REQUIRES a token for BOTH:
 * - HTTP (mutations)
 * - WebSocket (subscriptions)
 *
 * This token becomes `authorizationToken` in Lambda
 */
function getAuthToken() {
  // TEMP: hardcoded for testing
  // Replace with real token (JWT, session, etc.)
  return process.env.REACT_APP_AUTH_TOKEN || 'aaaa'
}

const client = generateClient({
  authMode: 'custom',
  authToken: getAuthToken(),
})

/**
 * Mutation: publishMessage
 * Supports two parameter sets:
 * 1. Client-owner: tenantID, propertyID, orderID (shareId is auto-generated)
 * 2. Owner: shareId, constructionID (optional)
 */
export const publishDocOwner = /* GraphQL */ `
  mutation PublishMessage($content: String!, $sender: String!, $shareId: String!, $constructionID: String) {
    publishMessage(content: $content, sender: $sender, shareId: $shareId, constructionID: $constructionID) {
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
`

export const publishDocOwnerSimple = /* GraphQL */ `
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
`

export const publishDocClientOwner = /* GraphQL */ `
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
`

/**
 * Subscription: onMessage(shareId: String!): Message
 */
export const subscribeDoc = /* GraphQL */ `
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
`

/**
 * Publish a message using owner parameters (shareId, constructionID optional)
 * @param {string} content - Message content
 * @param {string} sender - Sender identifier
 * @param {string} shareId - Share/room identifier
 * @param {string} [constructionID] - Optional construction ID
 * @returns {Promise<Message>}
 */
export async function publishOwner(content, sender, shareId, constructionID) {
  const variables = constructionID
    ? { content, sender, shareId, constructionID }
    : { content, sender, shareId }

  return client.graphql({
    query: constructionID ? publishDocOwner : publishDocOwnerSimple,
    variables,
    authMode: 'lambda',
    authToken: getAuthToken(),
  })
}

/**
 * Publish a message using client-owner parameters (tenantID, propertyID, orderID)
 * shareId will be auto-generated as `${tenantID}:${propertyID}:${orderID}`
 * @param {string} content - Message content
 * @param {string} sender - Sender identifier
 * @param {number} tenantID - Tenant ID
 * @param {number} propertyID - Property ID
 * @param {number} orderID - Order ID
 * @returns {Promise<Message>}
 */
export async function publishClientOwner(content, sender, tenantID, propertyID, orderID) {
  return client.graphql({
    query: publishDocClientOwner,
    variables: { content, sender, tenantID, propertyID, orderID },
    authMode: 'lambda',
    authToken: getAuthToken(),
  })
}

/**
 * Subscribe to messages for a shareId
 * @param {string} shareId - Share/room identifier
 * @param {(message: Message) => void} next - Callback when message received
 * @param {(err: any) => void} error - Optional error callback
 * @returns {Subscription} Subscription object with unsubscribe method
 */
export function subscribe(shareId, next, error) {
  const sub = client
    .graphql({
      query: subscribeDoc,
      variables: { shareId },
      authMode: 'lambda',
      authToken: getAuthToken(),
    })
    .subscribe({
      next: event => {
        const msg = event?.data?.onMessage
        if (msg != null) {
          next(msg)
        }
      },
      error: err => {
        if (error) {
          error(err)
        } else {
          console.warn('⚠️ Subscription warning (safe to ignore)', err)
        }
      },
      complete: () => {
        console.log('🔌 Subscription completed')
      },
    })

  return sub
}
