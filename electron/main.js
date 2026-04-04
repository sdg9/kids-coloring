const { app, BrowserWindow, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');

// Disable Chromium sandbox for Steam Deck/Linux compatibility
// See: https://github.com/ValveSoftware/steam-for-linux/issues/8781
if (process.platform === 'linux') {
  app.commandLine.appendSwitch('no-sandbox');
}

// Check for dev config (written at build time for dev builds)
let devUrl = null;
const devConfigPath = path.join(__dirname, 'dev-config.json');
if (fs.existsSync(devConfigPath)) {
  const config = JSON.parse(fs.readFileSync(devConfigPath, 'utf8'));
  devUrl = config.devUrl;
}

const isDev = !app.isPackaged;
const DEV_URL = process.env.DEV_URL || 'http://192.168.1.8:8080';

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    useContentSize: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  win.setMenuBarVisibility(false);

  // F12 to toggle DevTools (works in both dev and production)
  globalShortcut.register('F12', () => {
    win.webContents.toggleDevTools();
  });

  if (isDev) {
    win.loadURL(DEV_URL);
    win.webContents.openDevTools();

    // Register R key to refresh in dev mode
    globalShortcut.register('R', () => {
      win.webContents.reload();
    });
  } else if (devUrl) {
    // Packaged but configured to use dev server
    win.loadURL(devUrl);
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  globalShortcut.unregisterAll();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
