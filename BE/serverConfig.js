require('dotenv').config();
const { Server } = require('socket.io');

const http = require('http');
const express = require('express');
const cors = require('cors');
const routes = require('./router');
const cookieParser = require('cookie-parser');

const app = express();
const server = http.createServer(app);
const socketServer = new Server(server,{
  cors: {}
});

const PAYLOAD_LIMIT_SIZE = "100MB";

app.use(express.json({limit: PAYLOAD_LIMIT_SIZE}));
app.use(cors());
app.use(cookieParser());

app.use((req, res, next) => {
  res.customResponse = (status, message, data = "") => {
    res.json({
      status: status,
      message: message,
      data: data
    })
  }
  next();
})
app.use('/api', routes); // Sử dụng route chung
// app.use(express.static(path.join(__dirname, '../FE/build')));

// app.get('/', function (req, res) {
//   res.sendFile(path.join(__dirname, '../FE/build'));
// });


module.exports = { server, socketServer };

