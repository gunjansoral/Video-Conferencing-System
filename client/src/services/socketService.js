export const joinRoom = (socket, roomId, connected, callback) => {
  if (roomId && !connected) {
    socket.emit('join-room', roomId);
    callback()
  }
};

export const leaveRoom = (socket, roomId, connected, callback) => {
  if (roomId && connected) {
    socket.emit('leave-room', roomId);
    callback()
  }
};