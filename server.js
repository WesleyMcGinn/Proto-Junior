const fs = require('fs');
const shell = require('shelljs');
const http = require('http');
const ws = require('ws');
const wss = new ws.Server({noServer: true});
const clients = new Set();
const Gpio = require('pigpio').Gpio;
const l = new Gpio(14, {mode: Gpio.OUTPUT});
const r = new Gpio(15, {mode: Gpio.OUTPUT});
const z = new Gpio(18, {mode: Gpio.OUTPUT});
const led = new Gpio(26, {mode: Gpio.OUTPUT});

// Display IP Address By Blinking LED:
setTimeout(function() {
  ip = shell.exec("hostname -I");
  thru = 0; // How far through the blink sequence are we
  tpb = 140; // Time per blink (ms)
  seq = []; // List for blink sequence storage
  for (i=0; i<ip.length+2; i++) { // Form blink sequence
    if (i >= ip.length || ip[i] == '.') {
      seq.push(0);
      seq.push(0);
      seq.push(0);
      seq.push(0);
    } else {
      for (j=0; j<parseInt(ip[i]); j++) {
        seq.push(1);
        seq.push(0);
      }
      seq.push(0);
      seq.push(0);
    }
  }
  setInterval(function() {
    led.digitalWrite(seq[thru]);
    thru++;
    if (seq[thru] == undefined) {
      thru = 0;
    }
  }, tpb);
}, 5000);

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
    fs.readFile("/home/35E7/Proto-Junior/UI.html", function (err, data) {
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
