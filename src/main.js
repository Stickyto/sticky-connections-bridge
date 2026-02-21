const { version } = require('../package.json')
const { startServer } = require('./server')

console.log(`[sticky-connections-bridge] [v${version}] Starting...`)

process.on('uncaughtException', err => {
  console.error('[sticky-connections-bridge] Uncaught Exception:', err)
})

process.on('unhandledRejection', err => {
  console.error('[sticky-connections-bridge] Unhandled Rejection:', err)
})

const server = startServer()

console.log(`[sticky-connections-bridge] [v${version}] Listening...`)

function shutdown() {
  console.log('[sticky-connections-bridge] Shutting down...')
  server.close(() => {
    console.log('[sticky-connections-bridge] Shutdown complete.')
    process.exit(0)
  })
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
