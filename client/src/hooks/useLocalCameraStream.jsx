import { useEffect } from "react";

const useLocalStream = (callback) => {
  useEffect(() => {
    const getLocalStream = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        callback(stream);
      } catch (error) {
        console.error("Error accessing media devices:", error);
      }
    };

    getLocalStream();
  }, []);
};

export default useLocalStream;
