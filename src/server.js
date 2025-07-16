process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

const PORT = 8090

const express = require('express')
const app = express()
app.use(express.json())

function assert(expression, message) {
  if (!expression) {
    throw new Error(message)
  }
}

const allowedOrigins = [
  'https://sticky.to',
  'https://dashboard.sticky.to',

  'https://instantdebit.co.uk',
  'https://app.instantdebit.co.uk',

  'http://localhost:3002',
  'http://localhost:3003'
]

app.use((req, res, next) => {
  const origin = req.headers.origin
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204)
  }
  next()
})

const TRIGGERS = new Map([
  [
    'CONNECTION_PAX',
    async (reqBody) => {
      const { connectionConfig: [cTerminalAddress, cTerminalSerial, _cPairingCode, cAuthToken], howTo: { total, userPaymentId } } = reqBody

      async function makeRequest(method, url, body) {
        const res = await fetch(
          url,
          {
            method,
            headers: {
              Authorization: `Bearer ${cAuthToken}`,
              'Content-Type': 'application/json'
            },
            body: body ? JSON.stringify(body) : undefined
          }
        )
        assert(res.status === 200 || res.status === 201, res.statusText.trim())
        console.warn(`[sticky-connections-bridge] [TRIGGER] [CONNECTION_PAX] [makeRequest] res ${url}`, res)
        const json = await res.json()
        console.warn(`[sticky-connections-bridge] [TRIGGER] [CONNECTION_PAX] [makeRequest] json ${url}`, json)
        return json
      }

      const json = await makeRequest(
        'POST',
        `https://${cTerminalAddress}/POSitiveWebLink/1.0.0/transaction?tid=${cTerminalSerial}&silent=false`,
        {
          transType: 'SALE',
          amountTrans: total,
          amountGratuity: 0,
          amountCashback: 0,
          reference: userPaymentId,
          language: 'en_GB'
        }
      )

      console.warn('[sticky-connections-bridge] [TRIGGER] [CONNECTION_PAX] json', json)

      let wasSuccessful = false
      for (let i = 0; i < 24; i++) {
        try {
          console.warn('[sticky-connections-bridge] [TRIGGER] [CONNECTION_PAX] loop', i)
          const currentTransactionState = await makeRequest(
            'GET',
            `https://${cTerminalAddress}/POSitiveWebLink/1.0.0/transaction?tid=${cTerminalSerial}&uti=${json.uti}`
          )
          console.warn('[sticky-connections-bridge] [TRIGGER] [CONNECTION_PAX] currentTransactionState', currentTransactionState)
          if (currentTransactionState.transApproved === true) {
            wasSuccessful = true
            break
          } else {
            throw new Error('[INTERNAL] Sorry, the transaction was cancelled')
          }
        } catch (e) {
          if (e.message.startsWith('[INTERNAL]')) {
            throw new Error(e.message.substring('[INTERNAL] '.length))
          }
          console.warn('[sticky-connections-bridge] [TRIGGER] [CONNECTION_PAX] error', `[]${e.message}[]`)
        } finally {
          await new Promise(_ => setTimeout(_, 5 * 1000))
        }
      }

      if (!wasSuccessful) {
        throw new Error('Sorry, you ran out of time')
      }

      return {}
    }
  ]
])

app.post('/trigger/:triggerId', async (req, res) => {
  try {
    const { triggerId } = req.params
    console.warn('[sticky-connections-bridge] [TRIGGER] triggerId ->', triggerId)

    const foundTrigger = TRIGGERS.get(triggerId)
    assert(foundTrigger, `There is no trigger called ${triggerId}`)

    const r = await foundTrigger(req.body)
    res.json(r)
  } catch ({ message: error }) {
    res.status(500).json({ error })
  }
})

app.listen(
  PORT,
  () => {
    console.log(`[sticky-connections-bridge] Listening on http://localhost:${PORT}`)
  }
)
