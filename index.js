const express = require('express');
const app = express();
const http = require('http').Server(app);
const clientOrigin = process.env.CLIENT_ORIGIN || '*:*';
const io = require('socket.io')(http, {
  origins: clientOrigin,
  serveClient: false,
  pingInterval: 5000,
  pingTimeout: 15000
});
const port = process.env.PORT || 4000;

process.on('uncaughtException', (err) => {
  console.error('There was an uncaught error:', err);
  process.exit(1); // Exit the process with failure
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1); // Exit the process with failure
});

app.use(express.static(__dirname + '/public'));

io.on('connection', (socket) => require('./app/socket')(socket, io));

http.listen(port, () => console.log(`Listening on port ${port}`));

app.use((req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});
