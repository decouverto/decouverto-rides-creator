import { app, BrowserWindow, ipcMain } from 'electron';

require('electron-context-menu')({ 
  labels: {
    cut: 'Couper',
    copy: 'Copier',
    paste: 'Coller'
  }
});

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) { // eslint-disable-line global-require
  app.quit();
}

let googleMapsKey = require('fs').readFileSync(`${__dirname}/.googlemaps`, 'utf8');
let data;

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;
let previewWindow;


const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nativeWindowOpen: true
    },
    icon: `file://${__dirname}/icons/2048x2048.png`,
    title: 'Découverto: Outil de création de promenade'
  });

  // and load the index.html of the app.
  mainWindow.loadURL(`file://${__dirname}/index.html`);

  // Open the DevTools.
  //mainWindow.webContents.openDevTools();

  mainWindow.webContents.on('new-window', (event, url, frameName, disposition, options, additionalFeatures) => {
    if (frameName === 'modal') {
      // open window as modal
      event.preventDefault()
      Object.assign(options, {
        title: 'Aperçu',
        icon: `file://${__dirname}/icons/2048x2048.png`,
        modal: true,
        parent: mainWindow,
        width: 1280,
        height: 720
      })
      event.newGuest = new BrowserWindow(options)
    }
  })


  mainWindow.on('closed', () => {
    if (previewWindow) {
      previewWindow.close();
    }
    mainWindow = null;
  });
  
};

ipcMain.on('open-preview', (event, arg) => {
  previewWindow = new BrowserWindow({
    width: 800, 
    height: 400, 
    title: 'Découverto: Aperçu de la carte',
    icon: `file://${__dirname}/icons/2048x2048.png`
  });
  previewWindow.on('closed', () => {
    previewWindow = null;
  });
  previewWindow.loadURL(`file://${__dirname}/preview.html`);
  previewWindow.show();
  data = arg;
});
ipcMain.on('window-opened', (event) => {
  event.sender.send('data', { data, googleMapsKey });
});
// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
