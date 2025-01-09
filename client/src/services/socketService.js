export const joinRoom = (socket, roomId, callback) => {
  if (roomId && !connected) {
    socket.emit('join-room', roomId);
    callback()
  }
};

export const leaveRoom = (socket, roomId, callback) => {
  if (roomId && connected) {
    socket.emit('leave-room', roomId);
    callback()
  }
};