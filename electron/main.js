const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
const fs = require('fs')

let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  // 개발 모드면 localhost, 아니면 빌드된 파일
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

// 프로젝트 저장
ipcMain.handle('save-project', async (event, data) => {
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: '프로젝트 저장',
    defaultPath: 'project.json',
    filters: [{ name: 'JSON Files', extensions: ['json'] }]
  })
  if (canceled || !filePath) return { success: false, canceled: true }
  try {
    fs.writeFileSync(filePath, data, 'utf-8')
    return { success: true, filePath }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// 프로젝트 불러오기
ipcMain.handle('load-project', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: '프로젝트 불러오기',
    filters: [{ name: 'JSON Files', extensions: ['json'] }],
    properties: ['openFile']
  })
  if (canceled || filePaths.length === 0) return { success: false, canceled: true }
  try {
    const data = fs.readFileSync(filePaths[0], 'utf-8')
    return { success: true, data, filePath: filePaths[0] }
  } catch (error) {
    return { success: false, error: error.message }
  }
})
