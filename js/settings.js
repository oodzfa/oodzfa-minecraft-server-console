const { ipcRenderer } = require('electron')
window.$ = window.jQuery = require('jquery/dist/jquery.min.js')

$(document).ready(async function () {
  const settings = await ipcRenderer.invoke('getSettings')
  $('#javaPathBox').val(settings.javaPath)
  $('#jarPathBox').val(settings.jarPath)
  $('#memoryBox').val(settings.memory)
  $('#stopCommandBox').val(settings.stopCommand)
})

$('#selectJavaButton').click(async function () {
  const filePath = await ipcRenderer.invoke('selectJava')
  if (filePath) {
    $('#javaPathBox').val(filePath)
  }
})

$('#selectJarButton').click(async function () {
  const filePath = await ipcRenderer.invoke('selectJar')
  if (filePath) {
    $('#jarPathBox').val(filePath)
  }
})

$('#saveButton').click(function () {
  ipcRenderer.send('saveSettings', {
    javaPath: $('#javaPathBox').val(),
    jarPath: $('#jarPathBox').val(),
    memory: $('#memoryBox').val(),
    stopCommand: $('#stopCommandBox').val()
  })
})

$('#openServerFolderButton').click(function () {
  ipcRenderer.send('openServerFolder')
})
