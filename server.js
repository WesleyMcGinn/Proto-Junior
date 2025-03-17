const fs = require('fs');
const shell = require('shelljs');
const http = require('http');
const ws = require('ws');
const wss = new ws.Server({noServer: true});
const clients = new Set();
const Gpio = require('pigpio').Gpio;
const l = new Gpio(14, {mode: Gpio.OUTPUT});
const r = new Gpio(15, {mode: Gpio.OUTPUT});

http.createServer((req, res) => {
  if (req.url == "/connect") {
    res.writeHead(101, {'Upgrade':'websocket', 'Connection':'Upgrade'});
    wss.handleUpgrade(req, req.socket, Buffer.alloc(0), function(ws) {
		  clients.add(ws);
		  ws.on('message', function(message) {
		    var input = "" + message;
		    try {
          var output = eval(input);
          if (output) {
            ws.send(output.toString());
          }
        } catch(error) {
          ws.send("ERROR: " + error);
        }
      });
    });
  } else if (req.url == "/shutdown") {
    shell.exec("sudo shutdown -h now");
  } else if (req.url == "/reboot") {
    shell.exec("sudo reboot");
  } else {
    fs.readFile("./UI.html", function (err, data) {
      if (err) {
        console.log("404: HTML file does not exist!");
        res.writeHead(404, {'Content-Type': 'text/html'});
        return res.end("<body style='text-align: center'><h1><b><u>404 Error</u></b></h1><h2>Page not found.  :(</h2></body>");
      } else {
        res.writeHead(200, {'Content-Type': 'text/html'});
        return res.end(data);
      }
    });
  }
}).listen(8000);
