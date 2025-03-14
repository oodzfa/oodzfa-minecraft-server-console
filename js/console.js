const { ipcRenderer } = require('electron')
window.$ = window.jQuery = require('jquery/dist/jquery.min.js')

ipcRenderer.on('output', function (event, data) {
  $('<div>').addClass('text-gray-300').text(data).appendTo($('#outputBox'))
  scrollDiv.scrollTop(scrollDiv[0].scrollHeight)
})

ipcRenderer.on('state', function (event, data) {
  $('#startButton').prop('disabled', data.runing)
  $('#stopButton').prop('disabled', !data.runing)
  $('#execButton').prop('disabled', !data.runing)
})

$(document).ready(function () {
  ipcRenderer.send('getState')
})

$('#startButton').click(function () {
  $('#outputBox').html('')
  ipcRenderer.send('start')
})

$('#stopButton').click(function () {
  ipcRenderer.send('stop', false)
})

$('#execButton').click(function () {
  const input = $('#inputBox').val()
  if (input != '') {
    ipcRenderer.send('exec', input)
    $('#inputBox').val('')
  }
})
