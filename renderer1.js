const { ipcRenderer } = require("electron")
window.$ = window.jQuery = require("./node_modules/jquery/dist/jquery.min.js");

ipcRenderer.on("output", function (event, data) {
  span = $('<span/>', { text: data });
  $("#outputBox").append(span);
  var scrollDiv = $("#outputBox");
  scrollDiv.scrollTop(scrollDiv[0].scrollHeight);
})

ipcRenderer.on("state", function (event, data) {
  if (data.runing) {
    $("#startButton").prop("disabled", true)
    $("#stopButton").prop("disabled", false)
    $("#execButton").prop("disabled", false)
  } else {
    $("#startButton").prop("disabled", false)
    $("#stopButton").prop("disabled", true)
    $("#execButton").prop("disabled", true)
  }
})

$(document).ready(function () {
  ipcRenderer.send("getState")
})

$("#startButton").click(function () {
  $("#outputBox").html("")
  ipcRenderer.send("start")
})

$("#stopButton").click(function () {
  ipcRenderer.send("stop", false)
})

$("#execButton").click(function () {
  const input = $("#inputBox").val()
  if (input != "") {
    ipcRenderer.send("exec", input)
    $("#inputBox").val("")
  }
})
