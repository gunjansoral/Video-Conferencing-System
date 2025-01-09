import { useEffect } from "react";

const useRemoteCameraStream = (socket, peerConnection, targetUserId, setRemoteStream) => {

  useEffect(() => {
    socket.on('user-joined', async (userId) => {
      console.log(`User joined: ${userId}`);
      targetUserId.current = userId;
      const offer = await peerConnection.current.createOffer();
      await peerConnection.current.setLocalDescription(offer);
      socket.emit('signal', { signal: offer, to: userId });
    });
    socket.on('signal', async ({ signal, from }) => {
      console.log('Signal received:', signal, 'from:', from);

      if (signal.type === 'offer') {
        console.log('Processing offer...');
        await peerConnection.current.setRemoteDescription(new RTCSessionDescription(signal));
        const answer = await peerConnection.current.createAnswer();
        await peerConnection.current.setLocalDescription(answer);
        socket.emit('signal', { signal: answer, to: from });
      } else if (signal.type === 'answer') {
        console.log('Processing answer...');
        await peerConnection.current.setRemoteDescription(new RTCSessionDescription(signal));
      } else if (signal.candidate) {
        console.log('Adding ICE candidate:', signal.candidate);
        try {
          // Ensure the candidate object is correctly structured
          await peerConnection.current.addIceCandidate(
            new RTCIceCandidate({
              candidate: signal.candidate,
              sdpMid: signal.sdpMid,
              sdpMLineIndex: signal.sdpMLineIndex,
            })
          );
        } catch (error) {
          console.error('Error adding ICE candidate:', error);
        }
      }
    });


    socket.on('user-left', (userId) => {
      console.log(`User left: ${userId}`);
      setRemoteStream(null);
      if (peerConnection.current) {
        peerConnection.current.close();
        peerConnection.current = null;
      }
    });

    return () => {
      socket.off('user-joined');
      socket.off('signal');
      socket.off('user-left');
    };
  }, []);
}

export default useRemoteCameraStream;