import React, { useEffect, useState } from 'react'
import { publishOwner, publishClientOwner, subscribe } from './awsAppSync'

export default function App() {
  const senderId = React.useMemo(() => crypto.randomUUID(), [])
  const [shareId, setShareId] = useState('room-1')
  const [message, setMessage] = useState('')
  const [logs, setLogs] = useState([])
  const [mode, setMode] = useState('owner') // 'owner' or 'client-owner'

  // Client-owner parameters
  const [tenantID, setTenantID] = useState(1)
  const [propertyID, setPropertyID] = useState(1)
  const [orderID, setOrderID] = useState(1)
  const [constructionID, setConstructionID] = useState('')

  // Subscribe once on mount to onMessage
  useEffect(() => {
    const sub = subscribe(shareId, msg => {
      // msg is now a Message object: { id, content, sender, shareId, createdAt, ... }
      console.log("📩 RECEIVED", msg)
      setLogs(prev => [...prev, { type: 'recv', data: msg }])
    })

    console.log('SUBSCRIBED to shareId:', shareId)

    return () => sub.unsubscribe()
  }, [shareId])

  async function handlePublish() {
    if (!message.trim()) return
    try {
      let result

      if (mode === 'owner') {
        // Use owner parameters
        result = await publishOwner(message, senderId, shareId, constructionID || undefined)
      } else {
        // Use client-owner parameters
        result = await publishClientOwner(message, senderId, tenantID, propertyID, orderID)
      }

      // The mutation returns a Message object
      const publishedMessage = result.data?.publishMessage
      if (publishedMessage) {
        setLogs(prev => [...prev, { type: 'sent', data: publishedMessage }])
        // Update shareId if it was auto-generated (client-owner mode)
        if (mode === 'client-owner' && publishedMessage.shareId) {
          setShareId(publishedMessage.shareId)
        }
      }
      setMessage('')
    } catch (err) {
      console.error('Failed to publish:', err)
      alert(`Failed to publish: ${err.message}`)
    }
  }

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
      <h2 style={{ textAlign: 'center' }}>AppSync Message Tester</h2>

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
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
          <input
            type="text"
            placeholder="shareId"
            value={shareId}
            onChange={e => setShareId(e.target.value)}
            disabled={mode === 'client-owner'}
            style={{ padding: 4, borderRadius: 4, border: '1px solid #ccc' }}
          />
          {mode === 'owner' && (
            <input
              type="text"
              placeholder="constructionID (optional)"
              value={constructionID}
              onChange={e => setConstructionID(e.target.value)}
              style={{ padding: 4, borderRadius: 4, border: '1px solid #ccc' }}
            />
          )}
          {mode === 'client-owner' && (
            <>
              <input
                type="number"
                placeholder="tenantID"
                value={tenantID}
                onChange={e => setTenantID(parseInt(e.target.value) || 0)}
                style={{ padding: 4, borderRadius: 4, border: '1px solid #ccc', width: 100 }}
              />
              <input
                type="number"
                placeholder="propertyID"
                value={propertyID}
                onChange={e => setPropertyID(parseInt(e.target.value) || 0)}
                style={{ padding: 4, borderRadius: 4, border: '1px solid #ccc', width: 100 }}
              />
              <input
                type="number"
                placeholder="orderID"
                value={orderID}
                onChange={e => setOrderID(parseInt(e.target.value) || 0)}
                style={{ padding: 4, borderRadius: 4, border: '1px solid #ccc', width: 100 }}
              />
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
        {logs.map((log, i) => {
          const data = log.data || {}
          const content = data.content ?? String(data)
          const timestamp = data.createdAt ?? data.timestamp ?? new Date().toISOString()
          const isFromMe = data.sender === senderId

          const isSent = log.type === 'sent' || isFromMe

          return (
            <div
              key={i}
              style={{
                alignSelf: isSent ? 'flex-end' : 'flex-start',
                background: isSent ? '#dcf8c6' : '#e5e5ea',
                borderRadius: 16,
                padding: '8px 12px',
                margin: '6px 0',
                maxWidth: '70%',
                wordBreak: 'break-word',
              }}
            >
              <div>{content}</div>
              <div
                style={{
                  fontSize: 11,
                  color: '#666',
                  textAlign: isSent ? 'right' : 'left',
                }}
              >
                {new Date(timestamp).toLocaleTimeString()}
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
          onKeyDown={e => e.key === 'Enter' && handlePublish()}
          style={{ flex: 1, borderRadius: 8, padding: 8 }}
        />
        <button
          onClick={handlePublish}
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
