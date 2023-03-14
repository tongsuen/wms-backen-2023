

let io;
exports.socketConnection = (server) => {
  io = require('socket.io')(server);
  io.on('connection', (socket) => {
    console.info(`Client connected [id=${socket.id}]`);

    socket.join(socket.request._query.id);
    socket.on('action', (action) => {
        console.log("socket actions")
        if(action.type === 'server/hello'){
          console.log('Got hello data!', action.data);
          socket.emit('action', {type:'message', data:'good day!'});
        }
      });
    socket.on('disconnect', () => {
      console.info(`Client disconnected [id=${socket.id}]`);
    });
  });
};


exports.sendAlert = (roomId, key, data) => io.to(roomId).emit(key, data);

exports.getRooms = () => io.sockets.adapter.rooms;