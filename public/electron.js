import { app, BrowserWindow, shell, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import Store from 'electron-store';

// Initialize electron-store
const store = new Store({
  defaults: {
    comfyuiUrl: 'http://127.0.0.1:8188' // Default ComfyUI URL
  }
});

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Check if we're in development
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

let mainWindow;

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false, // Needed for local ComfyUI connections
      allowRunningInsecureContent: true, // For HTTP connections to ComfyUI
      preload: path.join(__dirname, 'preload.js') // Add preload script
    },
    icon: path.join(__dirname, 'icon.png'), // Optional: add an icon
    show: false // Don't show until ready
  });

  // Load the app
  const startUrl = isDev 
    ? 'http://localhost:5173' 
    : `file://${path.join(__dirname, '../dist/index.html')}`;
    
  mainWindow.loadURL(startUrl);

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Open DevTools in development
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle external links - open in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Prevent navigation away from the app
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    
    if (parsedUrl.origin !== 'http://localhost:5173' && parsedUrl.origin !== 'file://') {
      event.preventDefault();
    }
  });
}

// IPC Handlers
ipcMain.handle('get-comfyui-url', async () => {
  return store.get('comfyuiUrl');
});

ipcMain.handle('set-comfyui-url', async (event, url) => {
  try {
    store.set('comfyuiUrl', url);
    return { success: true };
  } catch (error) {
    console.error('Failed to set ComfyUI URL:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('is-comfyui-url-set', async () => {
  const url = store.get('comfyuiUrl');
  // Consider it "set" if it's not the default or if the user has explicitly saved it.
  // For simplicity now, we'll just check if it exists and is not empty.
  // A more robust check might involve a flag that's set after first user confirmation.
  return !!url; 
});


// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  createWindow();

  // On macOS, re-create window when dock icon is clicked
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed
app.on('window-all-closed', () => {
  // On macOS, keep app running even when all windows are closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
    shell.openExternal(navigationUrl);
  });
});
