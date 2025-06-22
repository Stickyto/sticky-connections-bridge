process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

const PORT = 8090

const express = require('express')
const app = express()
app.use(express.json())

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

      const url = `https://${cTerminalAddress}/POSitiveWebLink/1.0.0/transaction?tid=${cTerminalSerial}&silent=false`

      console.warn('[TRIGGER] [CONNECTION_PAX] url', url)

      const res = await fetch(
        url,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${cAuthToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            transType: 'SALE',
            amountTrans: total,
            amountGratuity: 0,
            amountCashback: 0,
            reference: userPaymentId,
            language: 'en_GB'
          })
        }
      )

      console.warn('[TRIGGER] [CONNECTION_PAX] res', res)

      assert(res.status === 200 || res.status === 201, res.statusText.trim())

      const json = await res.json()
      return {}
    }
  ]
])

app.post('/trigger/:triggerId', async (req, res) => {
  try {
    const { triggerId } = req.params
    console.warn('triggerId ->', triggerId)

    const foundTrigger = TRIGGERS.get(triggerId)
    assert(foundTrigger, `There is no trigger called ${triggerId}`)

    const r = await foundTrigger(req.body)
    res.json(r)
  } catch ({ message: error }) {
    res.status(500).json({ error })
    // res
    //   .header('content-type', 'text/plain')
    //   .status(500)
    //   .send(err.message)
  }
})

app.listen(
  PORT,
  () => {
    console.log(`Listening on http://localhost:${PORT}`)
  }
)
