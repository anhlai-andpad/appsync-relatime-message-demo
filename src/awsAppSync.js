import { generateClient } from 'aws-amplify/api'
import { Amplify } from 'aws-amplify'

/**
 * 🔑 IMPORTANT:
 * Lambda authorizer REQUIRES a token for BOTH:
 * - HTTP (mutations)
 * - WebSocket (subscriptions)
 *
 * Owner mode: Bearer token (REACT_APP_AUTH_TOKEN)
 * Client-owner mode: Cookie (REACT_APP_AUTH_COOKIE or document.cookie)
 */
function getAuthToken(mode = 'owner') {
  if (mode === 'client-owner') {
    return process.env.REACT_APP_AUTH_COOKIE ?? (typeof document !== 'undefined' ? document.cookie : '')
  }
  return 'Bearer ' + (process.env.REACT_APP_AUTH_TOKEN ?? '')
}

/**
 * Get the AppSync endpoint for the given mode
 * @param {string} mode - 'owner' or 'client-owner'
 * @returns {string} AppSync GraphQL endpoint
 */
function getEndpointForMode(mode) {
  if (mode === 'client-owner') {
    return process.env.REACT_APP_CLIENT_OWNER_APPSYNC_ENDPOINT || process.env.REACT_APP_OWNER_APPSYNC_ENDPOINT
  }
  return process.env.REACT_APP_OWNER_APPSYNC_ENDPOINT
}

/**
 * Get or create a client for the given mode
 */
const clientCache = {}

function getClient(mode = 'owner') {
  if (!clientCache[mode]) {
    const endpoint = getEndpointForMode(mode)
    if (!endpoint) {
      throw new Error(
        `AppSync endpoint not configured for mode: ${mode}. ` +
        `Set REACT_APP_${mode === 'client-owner' ? 'CLIENT_OWNER' : 'OWNER'}_APPSYNC_ENDPOINT in .env file.`
      )
    }

    Amplify.configure({
      API: {
        GraphQL: {
          endpoint,
          region: process.env.REACT_APP_AWS_REGION || 'ap-northeast-1',
          defaultAuthMode: 'lambda',
        },
      },
    })

    clientCache[mode] = generateClient({
      authMode: 'custom',
      authToken: getAuthToken(mode),
    })

    console.log(`📡 Created AppSync client for ${mode} mode`, { endpoint })
  }

  return clientCache[mode]
}

/**
 * Subscription: onMessage(shareID: String!, constructionID: String): Message
 * For owner mode
 */
export const subscribeDoc = /* GraphQL */ `
  subscription OnMessage($shareID: String!, $constructionID: String) {
    onMessage(shareID: $shareID, constructionID: $constructionID) {
      id
      eventSource
      shareID
      constructionID
    }
  }
`

/**
 * Subscription: onMessage(tenantID: Int!, propertyID: Int!, orderID: Int!): Message
 * For client-owner mode
 */
export const subscribeDocClientOwner = /* GraphQL */ `
  subscription OnMessage($tenantID: Int!, $propertyID: Int!, $orderID: Int!) {
    onMessage(tenantID: $tenantID, propertyID: $propertyID, orderID: $orderID) {
      id
      eventSource
      tenantID
      propertyID
      orderID
    }
  }
`

/**
 * Subscribe to messages
 * 
 * This subscription will receive messages from:
 * 1. Frontend mutations (when publishMessage is called)
 * 2. Backend Subscriber (when messages are created via API and forwarded to AppSync)
 * 
 * For owner mode: subscription filter is based on shareID and constructionID
 * For client-owner mode: subscription filter is based on tenantID, propertyID, orderID
 * 
 * @param {string|number} shareIDOrTenantID - Share/room identifier (owner mode) or tenantID (client-owner mode)
 * @param {(message: Message) => void} next - Callback when message received
 * @param {(err: any) => void} [error] - Optional error callback
 * @param {string|number} [constructionIDOrPropertyID] - constructionID (owner mode) or propertyID (client-owner mode)
 * @param {string} [mode] - Mode ('owner' or 'client-owner'), defaults to 'owner'
 * @param {number} [orderID] - Order ID (client-owner mode only)
 * @returns {Subscription} Subscription object with unsubscribe method
 */
export function subscribe(shareIDOrTenantID, next, error = null, constructionIDOrPropertyID = null, mode = 'owner', orderID = null) {
  const client = getClient(mode)
  
  let query, variables

  if (mode === 'client-owner') {
    // Client-owner mode: use tenantID, propertyID, orderID
    if (typeof shareIDOrTenantID !== 'number' || typeof constructionIDOrPropertyID !== 'number' || typeof orderID !== 'number') {
      throw new Error('For client-owner mode, shareIDOrTenantID, constructionIDOrPropertyID, and orderID must be numbers')
    }
    query = subscribeDocClientOwner
    variables = {
      tenantID: shareIDOrTenantID,
      propertyID: constructionIDOrPropertyID,
      orderID: orderID,
    }
  } else {
    // Owner mode: use shareID and optional constructionID
    query = subscribeDoc
    variables = {
      shareID: shareIDOrTenantID,
      ...(constructionIDOrPropertyID && { constructionID: constructionIDOrPropertyID }),
    }
  }

  const sub = client
    .graphql({
      query,
      variables,
      authMode: 'lambda',
      authToken: getAuthToken(mode),
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
