const { app, BrowserWindow, Menu, ipcMain, dialog, shell } = require('electron')
const https = require('https')
const path = require('node:path')
const { spawn, exec } = require('child_process')
const fs = require('fs')
const decoder = new TextDecoder('utf-8')

const VERSION = '1.2.2'

var child = null
var runing = false
var settings = {
  javaPath: 'java',
  jarPath: 'server.jar',
  memory: '2048',
  stopCommand: 'stop'
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })

  Menu.setApplicationMenu(null)

  mainWindow.on('close', function (e) {
    if (runing) {
      e.preventDefault()
      dialog.showMessageBox(mainWindow, {
        type: 'warning',
        buttons: ['确定', '取消'],
        title: '提示',
        message: '服务器正在运行，是否强制停止？',
        cancelId: 1
      }).then((result) => {
        if (result.response === 0) {
          if (process.platform === 'linux' || process.platform === 'darwin') {
            child.kill()
          } else if (process.platform === 'win32') {
            try { exec(`taskkill /pid ${child.pid} /T /F`) } catch (e) { }
          }
          console.log('[app]force stop')
          mainWindow.destroy()
        }
      })
    }
  })

  https.get('https://oodzfa.github.io/omsc/latest_version.txt', (res) => {
    res.setEncoding('utf8')
    res.on('data', (chunk) => {
      if (!chunk.includes(VERSION)) {
        dialog.showMessageBox(mainWindow, {
          type: 'question',
          buttons: ['确定', '取消'],
          title: '提示',
          message: '检测到新版本，是否前往下载？',
          cancelId: 1
        }).then((result) => {
          if (result.response === 0) {
            shell.openExternal('https://klpbbs.com/thread-152360-1-1.html')
          }
        })
      }
    })

    res.on('error', (e) => {
      console.error(`[app]error: ${e.message}`)
    })
  })

  ipcMain.on('getState', (event) => {
    mainWindow.webContents.send('state', {
      runing: runing
    })
  })

  ipcMain.on('start', (event) => {
    if (!runing) {
      runing = true
      console.log('[app]start')
      mainWindow.webContents.send('state', {
        runing: runing
      })
      const options = {
        cwd: path.join(settings.jarPath, '..')
      }
      child = spawn(settings.javaPath, [`-Xms${settings.memory}M`, `-Xmx${settings.memory}M`, '-jar', settings.jarPath, 'nogui'], options)
      child.stdout.on('data', (data) => {
        const str = decoder.decode(data)
        console.log(`[output]${str.trim()}`)
        mainWindow.webContents.send('output', str)
      })
      child.stderr.on('data', (data) => {
        const str = decoder.decode(data)
        console.log(`[output]${str.trim()}`)
        mainWindow.webContents.send('output', str)
      })
      child.on('exit', (code) => {
        runing = false
        console.log(`[app]exit code: ${code}`)
        mainWindow.webContents.send('state', {
          runing: runing
        })
      })
      child.on('error', (error) => {
        if (process.platform === 'linux' || process.platform === 'darwin') {
          child.kill()
        } else if (process.platform === 'win32') {
          try { exec(`taskkill /pid ${child.pid} /T /F`) } catch (e) { }
        }
        runing = false
        console.error(`[app]error: ${error.message}`)
        mainWindow.webContents.send('state', {
          runing: runing
        })
        dialog.showMessageBox(mainWindow, {
          type: 'error',
          buttons: ['确定'],
          title: '运行错误',
          message: error.message
        })
      })
    }
  })

  ipcMain.on('stop', (event, data) => {
    child.stdin.write(`${settings.stopCommand}\n`)
  })

  ipcMain.on('exec', (event, data) => {
    child.stdin.write(`${data}\n`)
    console.log(`[input]${data}`)
    mainWindow.webContents.send('output', `> ${data}`)
  })

  function pluginList() {
    try {
      const pluginDir = path.join(settings.jarPath, '..', 'plugins')
      const modDir = path.join(settings.jarPath, '..', 'mods')
      const pluginFiles = fs.existsSync(pluginDir) ? fs.readdirSync(pluginDir) : []
      const modFiles = fs.existsSync(modDir) ? fs.readdirSync(modDir) : []

      const plugins = pluginFiles
        .filter(file => file.endsWith('.jar'))
        .map(file => ({ name: file, type: 'plugin' }))

      const mods = modFiles
        .filter(file => file.endsWith('.jar'))
        .map(file => ({ name: file, type: 'mod' }))

      mainWindow.webContents.send('pluginList', [...plugins, ...mods])
    } catch (e) {
      mainWindow.webContents.send('pluginList', [])
    }
  }

  ipcMain.on('getPluginList', (event, data) => {
    pluginList()
  })

  ipcMain.on('deletePlugin', (event, data, data2) => {
    dialog.showMessageBox(mainWindow, {
      type: 'question',
      buttons: ['确定', '取消'],
      title: '提示',
      message: `是否要删除这个组件？`,
      cancelId: 1
    }).then((result) => {
      if (result.response === 0) {
        try {
          fs.unlinkSync(path.join(settings.jarPath, '..', `${data2}s`, data));
          console.log(`[app]deleted ${data2}: ${data}`);
          pluginList()
        } catch (e) {
          console.error(`[app]error: ${e.message}`);
          dialog.showMessageBox(mainWindow, {
            type: 'error',
            buttons: ['确定'],
            title: '删除组件错误',
            message: e.message
          })
        }
      }
    })
  })

  ipcMain.on('addPlugin', async (event, data) => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [{
        name: 'jar',
        extensions: ['jar']
      }]
    })
    if (result.filePaths[0]) {
      try {
        fs.mkdirSync(path.join(settings.jarPath, '..', `${data}s`), { recursive: true })
        fs.copyFileSync(result.filePaths[0], path.join(settings.jarPath, '..', `${data}s`, path.basename(result.filePaths[0])))
        console.log(`[app]added ${data}: ${path.basename(result.filePaths[0])}`)
        pluginList()
      } catch (e) {
        console.error(`[app]error: ${e.message}`)
        dialog.showMessageBox(mainWindow, {
          type: 'error',
          buttons: ['确定'],
          title: '添加组件错误',
          message: e.message
        })
      }
    }
  })

  ipcMain.handle('getSettings', async (event, data) => {
    return settings
  })

  ipcMain.on('saveSettings', (event, data) => {
    if (data.javaPath == '' || data.jarPath == '' || data.memory == '' || data.stopCommand == '') {
      dialog.showMessageBox(mainWindow, {
        type: 'error',
        buttons: ['确定'],
        title: '设置错误',
        message: '请填写所有选项'
      })
      return
    }
    settings.javaPath = data.javaPath
    settings.jarPath = data.jarPath
    settings.memory = data.memory
    settings.stopCommand = data.stopCommand
    console.log(`[app]save settings: ${JSON.stringify(settings)}`)
    mainWindow.loadFile('./html/console.html')
  })

  ipcMain.handle('selectJava', async (event, data) => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [{
        name: 'java',
        extensions: ['exe']
      }]
    })
    return result.filePaths[0]
  })

  ipcMain.handle('selectJar', async (event, data) => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [{
        name: 'jar',
        extensions: ['jar']
      }]
    })
    return result.filePaths[0]
  })

  ipcMain.on('openServerFolder', async (event, data) => {
    shell.openPath(path.join(settings.jarPath, '..'))
  })

  mainWindow.loadFile('./html/console.html')
}

app.whenReady().then(() => {
  if (process.platform !== 'win32' && process.platform !== 'darwin' && process.platform !== 'linux') {
    app.quit()
  }

  try {
    const temp = JSON.parse(fs.readFileSync(path.join(app.getPath('userData'), 'settings.json'), 'utf-8'))
    settings.javaPath = temp.javaPath || 'java'
    settings.jarPath = temp.jarPath || 'server.jar'
    settings.memory = temp.memory || '2048'
    settings.stopCommand = temp.stopCommand || 'stop'
  } catch (e) { }

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', function () {
  fs.writeFileSync(path.join(app.getPath('userData'), 'settings.json'), JSON.stringify(settings))
  app.quit()
})
