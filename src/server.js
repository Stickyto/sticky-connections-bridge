process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

const PORT = 8090
const ABSTRACT_WAIT_TIME = 60

const express = require('express')

function assert (expression, message) {
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

function createApp () {
  const app = express()
  app.use(express.json())

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
        const {
          connectionConfig: [cTerminalAddress, cTerminalSerial, _cPairingCode, cAuthToken],
          howTo: { currency, total, userPaymentId }
        } = reqBody

        async function makeRequest (method, url, body) {
          const res = await fetch(url, {
            method,
            headers: {
              Authorization: `Bearer ${cAuthToken}`,
              'Content-Type': 'application/json'
            },
            body: body ? JSON.stringify(body) : undefined
          })

          console.warn(
            `[sticky-connections-bridge] [CONNECTION_PAX] ${method} ${url} → ${res.status}`
          )

          assert(res.status === 200 || res.status === 201, res.statusText.trim())
          return res.json()
        }

        const responseJson = await makeRequest(
          'POST',
          `https://${cTerminalAddress}/POSitiveWebLink/1.0.0/transaction?tid=${cTerminalSerial}&silent=false`,
          {
            transType: 'SALE',
            transCurrencyCode: currency,
            amountTrans: total,
            amountGratuity: 0,
            amountCashback: 0,
            reference: userPaymentId,
            language: 'en_GB'
          }
        )

        let wasSuccessful = false

        for (let i = 0; i < ABSTRACT_WAIT_TIME; i++) {
          try {
            const currentPayment = await makeRequest(
              'GET',
              `https://${cTerminalAddress}/POSitiveWebLink/1.0.0/transaction?tid=${cTerminalSerial}&uti=${responseJson.uti}`
            )

            if (currentPayment.transCancelled === true) {
              throw new Error('[INTERNAL] Payment was cancelled.')
            }

            if (currentPayment.transApproved === true) {
              wasSuccessful = true
              break
            }
          } catch (e) {
            if (e.message.startsWith('[INTERNAL]')) {
              throw new Error(e.message.replace('[INTERNAL] ', ''))
            }
          } finally {
            await new Promise(r => setTimeout(r, 1000))
          }
        }

        if (!wasSuccessful) {
          throw new Error('Payment failed or timed out.')
        }

        return {}
      }
    ]
  ])

  app.post('/trigger/:triggerId', async (req, res) => {
    try {
      const { triggerId } = req.params
      console.warn('[sticky-connections-bridge] triggerId →', triggerId)

      const foundTrigger = TRIGGERS.get(triggerId)
      assert(foundTrigger, `There is no trigger called ${triggerId}.`)

      const r = await foundTrigger(req.body)
      res.json(r)
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  app.get('/health', (_, res) => {
    res.json({ status: 'ok' })
  })

  return app
}

function startServer(port = PORT) {
  const app = createApp()
  const server = app.listen(port, '127.0.0.1')
  return server
}

module.exports = {
  startServer
}
