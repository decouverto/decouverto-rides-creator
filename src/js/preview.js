const { ipcRenderer } = require('electron');

ipcRenderer.send('window-opened')
ipcRenderer.on('data', (event, arg) => {  
    console.log(arg);
});
