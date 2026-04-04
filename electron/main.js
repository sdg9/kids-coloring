const { app, BrowserWindow, globalShortcut } = require('electron');
const path = require('path');
const http = require('http');

// Disable Chromium sandbox for Steam Deck/Linux compatibility
// See: https://github.com/ValveSoftware/steam-for-linux/issues/8781
if (process.platform === 'linux') {
  app.commandLine.appendSwitch('no-sandbox');
}

const DEV_URL = process.env.DEV_URL || 'http://192.168.1.8:8080';
const CONNECT_TIMEOUT_MS = 2000;

function checkServer(url) {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout: CONNECT_TIMEOUT_MS }, (res) => {
      res.resume(); // drain response
      resolve(res.statusCode >= 200 && res.statusCode < 400);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

function injectToast(win, message, isOnline) {
  const color = isOnline ? '#4CAF50' : '#FF9800';
  const js = `
    (() => {
      const toast = document.createElement('div');
      toast.textContent = ${JSON.stringify(message)};
      toast.style.cssText = 'position:fixed;top:16px;right:16px;padding:10px 20px;border-radius:8px;' +
        'font-family:Arial,sans-serif;font-size:14px;color:#fff;z-index:99999;opacity:1;' +
        'transition:opacity 0.5s;background:${color};pointer-events:none;';
      document.body.appendChild(toast);
      setTimeout(() => { toast.style.opacity = '0'; }, 2500);
      setTimeout(() => toast.remove(), 3000);
    })();
  `;
  win.webContents.once('did-finish-load', () => {
    win.webContents.executeJavaScript(js).catch(() => {});
  });
}

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

  // F12 to toggle DevTools
  globalShortcut.register('F12', () => {
    win.webContents.toggleDevTools();
  });

  // Try dev server first, fall back to local build
  checkServer(DEV_URL).then((serverAvailable) => {
    if (serverAvailable) {
      injectToast(win, 'Connected to dev server', true);
      win.loadURL(DEV_URL);
    } else {
      injectToast(win, 'Running offline', false);
      win.loadFile(path.join(__dirname, '../dist/index.html'));
    }
  });
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
