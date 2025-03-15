const { ipcRenderer } = require('electron')
window.$ = window.jQuery = require('jquery/dist/jquery.min.js')

$(document).ready(function () {
    ipcRenderer.send('getPluginList')
})

ipcRenderer.on("pluginList", function (event, data) {
    $('#pluginList').empty();
    data.forEach((plugin) => {
        $('#pluginList').append(`<tr>
            <td>${plugin.name}</td>
            <td class="text-center w-32">${plugin.type == 'plugin' ? '插件' : plugin.type}</td>
            <td class="text-center w-32">
                <button class="px-3 py-1 bg-red-500 text-white rounded transition-colors hover:bg-red-600 active:bg-red-700 plugin-delete-btn" data-name="${plugin.name}" data-type="${plugin.type}">删除</button>
            </td>
        </tr>`)
    })
})

$('#refresh').on('click', function () {
    ipcRenderer.send('getPluginList')
})

$('#addPlugin').on('click', function () {
    ipcRenderer.send('addPlugin', 'plugin')
})

$('#addMod').on('click', function () {
    ipcRenderer.send('addPlugin', 'mod')
})

$('#pluginList').on('click', '.plugin-delete-btn', function () {
    ipcRenderer.send('deletePlugin', $(this).data('name'), $(this).data('type'))
})
