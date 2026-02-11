import React, { useEffect, useState } from 'react'
import { subscribe } from './awsAppSync'

export default function App() {
  const senderId = React.useMemo(() => crypto.randomUUID(), [])
  const [message, setMessage] = useState('')
  const [logs, setLogs] = useState([])
  const [mode, setMode] = useState('owner') // 'owner' or 'client-owner'
  
  // owner parameters
  const [shareId, setShareId] = useState('2406ea5e-cdfd-4b53-bbd0-e6a53bfe11a5')
  const [constructionID, setConstructionID] = useState('c7f4af4f-c76d-4854-a018-849d5385bb72')

  // client-owner parameters
  const [tenantID, setTenantID] = useState(123459)
  const [propertyID, setPropertyID] = useState(147568)
  const [orderID, setOrderID] = useState(756766)

  useEffect(() => {
    if (mode === 'owner') {
      if (!shareId) {
        console.warn('⚠️ Cannot subscribe: shareId is empty (owner mode)')
        return
      }
    } else {
      // client-owner mode
      if (!tenantID || !propertyID || !orderID) {
        console.warn('⚠️ Cannot subscribe: tenantID, propertyID, or orderID is missing (client-owner mode)')
        return
      }
    }

    const endpoint = mode === 'client-owner' 
      ? process.env.REACT_APP_CLIENT_OWNER_APPSYNC_ENDPOINT 
      : process.env.REACT_APP_OWNER_APPSYNC_ENDPOINT

    console.log('🔌 SUBSCRIBING', {
      mode: mode,
      endpoint: endpoint,
      ...(mode === 'owner' && constructionID && { constructionID }),
      ...(mode === 'client-owner' && { tenantID, propertyID, orderID }),
    })

    const sub = subscribe(
      // For owner mode: pass shareId, for client-owner mode: pass tenantID
      mode === 'owner' ? shareId : tenantID,
      msg => {
        // msg is now a Message object: { id, eventSource, body, shareID, constructionID }
        // Check if message is from backend subscriber based on eventSource
        const isFromSubscriber = msg.eventSource === 'client.construction.message.owner.created' || 
                                 msg.eventSource?.includes('subscriber') ||
                                 msg.eventSource?.includes('backend')

        console.log("📩 RECEIVED MESSAGE", {
          from: isFromSubscriber ? 'Subscriber (Backend)' : 'Other',
          id: msg.id,
          eventSource: msg.eventSource,
          body: msg.body,
          shareID: msg.shareID,
          constructionID: msg.constructionID,
        })

        // Store message with type indicator
        setLogs(prev => [...prev, {
          type: isFromSubscriber ? 'subscriber' : 'recv',
          data: msg,
        }])
      },
      err => {
        console.error('❌ Subscription error:', err)
        // Don't show alert for subscription errors as they might be transient
      },
      // For owner mode: pass constructionID, for client-owner mode: pass propertyID
      mode === 'owner' ? (constructionID || null) : propertyID,
      mode,
      // For client-owner mode: pass orderID as the last parameter
      mode === 'client-owner' ? orderID : null
    )

    console.log('✅ SUBSCRIBED', {
      mode: mode,
      ...(mode === 'owner' && constructionID && { constructionID }),
      ...(mode === 'client-owner' && { tenantID, propertyID, orderID }),
    })

    return () => {
      console.log('🔌 UNSUBSCRIBING', {
        mode: mode,
      })
      sub.unsubscribe()
    }
  }, [shareId, constructionID, tenantID, propertyID, orderID, mode])

  return (
    <div
      style={{
        maxWidth: 800,
        margin: '40px auto',
        fontFamily: 'system-ui, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        height: '80vh',
      }}
    >
      <h2 style={{ textAlign: 'center' }}>Demo Realtime Message with AWS AppSync</h2>
      <div style={{ textAlign: 'center', fontSize: 12, color: '#666', marginBottom: 4 }}>
        Environment: <strong>{process.env.REACT_APP_ENV ?? 'unknown'}</strong>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, color: '#666' }}>AppSync endpoint:</span>
        <input
          type="text"
          readOnly
          value={mode === 'client-owner' ? (process.env.REACT_APP_CLIENT_OWNER_APPSYNC_ENDPOINT || process.env.REACT_APP_OWNER_APPSYNC_ENDPOINT) || '' : (process.env.REACT_APP_OWNER_APPSYNC_ENDPOINT || '')}
          placeholder="not set"
          style={{ fontSize: 12, padding: '4px 8px', minWidth: 280, maxWidth: 420, border: '1px solid #ccc', borderRadius: 4, background: '#fafafa' }}
          onClick={e => e.target.select()}
        />
        <button
          type="button"
          onClick={() => {
            const url = mode === 'client-owner' ? (process.env.REACT_APP_CLIENT_OWNER_APPSYNC_ENDPOINT || process.env.REACT_APP_OWNER_APPSYNC_ENDPOINT) : process.env.REACT_APP_OWNER_APPSYNC_ENDPOINT
            if (url) navigator.clipboard?.writeText(url).then(() => alert('Copied to clipboard'))
          }}
          style={{ fontSize: 12, padding: '4px 10px', cursor: 'pointer', borderRadius: 4, border: '1px solid #ccc', background: '#fff' }}
        >
          Copy
        </button>
      </div>

      {/* Mode selector */}
      <div style={{ marginBottom: 16, display: 'flex', gap: 8, justifyContent: 'center' }}>
        <button
          onClick={() => setMode('owner')}
          style={{
            padding: '8px 16px',
            background: mode === 'owner' ? '#4caf50' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
          }}
        >
          Owner Mode
        </button>
        <button
          onClick={() => setMode('client-owner')}
          style={{
            padding: '8px 16px',
            background: mode === 'client-owner' ? '#4caf50' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
          }}
        >
          Client-Owner Mode
        </button>
      </div>

      {/* Parameters */}
      <div style={{ marginBottom: 16, padding: 12, background: '#f0f0f0', borderRadius: 8 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {mode === 'owner' && (
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: '#333' }}>shareId</label>
              <input
                type="text"
                value={shareId}
                onChange={e => setShareId(e.target.value)}
                style={{ padding: 4, borderRadius: 4, border: '1px solid #ccc', width: 280, boxSizing: 'border-box' }}
              />
            </div>
          )}
          {mode === 'owner' && (
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: '#333' }}>constructionID</label>
              <input
                type="text"
                value={constructionID}
                onChange={e => setConstructionID(e.target.value)}
                style={{ padding: 4, borderRadius: 4, border: '1px solid #ccc', width: 280, boxSizing: 'border-box' }}
              />
            </div>
          )}
          {mode === 'client-owner' && (
            <>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: '#333' }}>tenantID</label>
                <input
                  type="number"
                  value={tenantID}
                  onChange={e => setTenantID(parseInt(e.target.value) || 0)}
                  style={{ padding: 4, borderRadius: 4, border: '1px solid #ccc', width: 120, boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: '#333' }}>propertyID</label>
                <input
                  type="number"
                  value={propertyID}
                  onChange={e => setPropertyID(parseInt(e.target.value) || 0)}
                  style={{ padding: 4, borderRadius: 4, border: '1px solid #ccc', width: 120, boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: '#333' }}>orderID</label>
                <input
                  type="number"
                  value={orderID}
                  onChange={e => setOrderID(parseInt(e.target.value) || 0)}
                  style={{ padding: 4, borderRadius: 4, border: '1px solid #ccc', width: 120, boxSizing: 'border-box' }}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Chat area */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          border: '1px solid #ccc',
          borderRadius: 8,
          padding: 12,
          background: '#f9f9f9',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {logs.length === 0 && (
          <div style={{ textAlign: 'center', color: '#999', padding: 20 }}>
            <div>No messages yet. Send a message or wait for messages from the Subscriber.</div>
            <div style={{ fontSize: 12, marginTop: 8 }}>
              💡 Messages published by the backend Subscriber will appear here automatically
            </div>
          </div>
        )}
        {logs.map((log, i) => {
          // Handle both old format (log.data) and new format (log is the message directly)
          const data = log.data || log
          // Use body field (new schema) or fallback to content (old schema) or empty string
          const content = data.body || data.content || ''
          // Use updatedAt, createdAt, or current time
          const timestamp = data.updatedAt || data.createdAt || new Date().toISOString()
          const isFromMe = data.sender === senderId
          // Check if from subscriber based on type or eventSource
          const isFromSubscriber = log.type === 'subscriber' || 
                                   data.sender === 'subscriber' || 
                                   data.eventSource === 'client.construction.message.owner.created' ||
                                   data.eventSource?.includes('subscriber') ||
                                   data.eventSource?.includes('backend')

          const isSent = log.type === 'sent' || isFromMe

          // Different colors for different message sources
          const backgroundColor = isFromSubscriber
            ? '#fff3cd' // Yellow for Subscriber messages
            : isSent
              ? '#dcf8c6' // Green for sent messages
              : '#e5e5ea' // Gray for received messages

          const borderColor = isFromSubscriber ? '#ffc107' : 'transparent'

          return (
            <div
              key={i}
              style={{
                alignSelf: isSent ? 'flex-end' : 'flex-start',
                background: backgroundColor,
                border: isFromSubscriber ? `2px solid ${borderColor}` : 'none',
                borderRadius: 16,
                padding: '8px 12px',
                margin: '6px 0',
                maxWidth: '70%',
                wordBreak: 'break-word',
                position: 'relative',
              }}
            >
              {isFromSubscriber && (
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 'bold',
                    color: '#856404',
                    marginBottom: 4,
                    textTransform: 'uppercase',
                  }}
                >
                  🔔 SENT BY Subscriber Service (Backend)
                </div>
              )}
              <div>{content}</div>
              <div
                style={{
                  fontSize: 11,
                  color: '#666',
                  textAlign: isSent ? 'right' : 'left',
                  marginTop: 4,
                }}
              >
                {new Date(timestamp).toLocaleTimeString()}
                {data.sender && data.sender !== senderId && data.sender !== 'subscriber' && (
                  <span style={{ marginLeft: 8, fontStyle: 'italic' }}>
                    from {data.sender.substring(0, 8)}...
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Message input */}
      <div
        style={{
          display: 'flex',
          marginTop: 10,
          gap: 8,
        }}
      >
        <input
          type="text"
          placeholder="Type a message..."
          value={message}
          onChange={e => setMessage(e.target.value)}
          style={{ flex: 1, borderRadius: 8, padding: 8 }}
        />
        <button
          onClick={() => console.log('Send message')}
          style={{
            borderRadius: 8,
            background: '#4caf50',
            color: 'white',
            padding: '8px 16px',
            border: 'none',
          }}
        >
          Send
        </button>
      </div>
    </div>
  )
}
