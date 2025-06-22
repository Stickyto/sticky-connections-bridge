const { version } = require('../package.json')

const { app, Tray, Menu, nativeImage } = require('electron')
const path = require('path')
require('./server')

let tray = null

app.whenReady().then(() => {
  const iconPath = path.join(__dirname, 'icon.png')
  const icon = nativeImage.createFromPath(iconPath)

  tray = new Tray(icon)
  const contextMenu = Menu.buildFromTemplate([
    { label: `Sticky Connections (${version})`, enabled: false },
    { type: 'separator' },
    { label: 'Quit', role: 'quit' }
  ])
  tray.setToolTip('Sticky Connections')
  tray.setContextMenu(contextMenu)
})

if (process.platform === 'darwin') {
  app.dock.hide()
}
