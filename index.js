const WebSocket = require('ws');
const express = require('express');
const os = require('os');
const http = require('http');

// Function to get local IP address
function getLocalIPAddress() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'localhost';
}

const localIP = getLocalIPAddress();
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

wss.on('connection', function connection(ws) {
    ws.on('message', function incoming(message) {
        console.log('received: %s', message);
        wss.clients.forEach(function each(client) {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    });

    ws.send('You are connected to WebSocket server');
});

// Serve the index.html file and dynamically set the WebSocket address
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>WebSocket Test</title>
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <style>
        html {
          height: 100%;
          width: 100%;
        }
        #messages { list-style-type: none; margin: 0; padding: 0; }
        #messages li { padding: 8px; background-color: #f3f3f3; margin-bottom: 1px; }
        #messages { height: 70dvh; overflow-y: scroll; }
    </style>
</head>
<body>
    <h2>WebSocket Test</h2>
    <ul id="messages"></ul>
    <form id="form">
        <input id="input" autocomplete="off" /><button>Send</button>
    </form>

    <script>

    var ws;
    var messages = document.getElementById('messages');

    function showMessage(message) {
        var li = document.createElement('li');
        li.textContent = message;
        messages.appendChild(li);
        window.scrollTo(0, document.body.scrollHeight);
    }

    function connect() {
        ws = new WebSocket('ws://${localIP}:8080');

        ws.onopen = function() {
            showMessage('Connected to WebSocket.');
        };

        ws.onmessage = function(event) {
          if (event.data instanceof Blob) {
              // The message is a Blob, read it as text
              const reader = new FileReader();
              reader.onload = function() {
                  showMessage(reader.result);
              };
              reader.readAsText(event.data);
          } else {
              // The message is already text
              showMessage(event.data);
          }
        };

        ws.onclose = function() {
            showMessage('WebSocket connection closed. Attempting to reconnect...');
            setTimeout(function() {
                connect();
            }, 1000); // Attempt to reconnect after 1 second
        };

        ws.onerror = function(err) {
            showMessage('WebSocket error. See console for details.');
            console.error('WebSocket Error:', err);
        };
      }

      document.getElementById('form').onsubmit = function() {
        var input = document.getElementById('input');
        if (input.value) {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(input.value);
            } else {
                showMessage('WebSocket is not connected.');
            }
            input.value = '';
        }
        return false;
      };

      // Initial connection
      connect();
    </script>
</body>
</html>
    `);
});

// Start the server
server.listen(8080, '0.0.0.0', () => {
    console.log(`Server and WebSocket are running on http://${localIP}:8080`);
});