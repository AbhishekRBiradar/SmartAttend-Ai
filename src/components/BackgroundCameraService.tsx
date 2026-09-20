import React, { useEffect } from 'react';

const BackgroundCameraService: React.FC = () => {
  useEffect(() => {
    // Optional background worker initialization for face-api models or keep-alive
    return () => {
      // cleanup
    };
  }, []);

  return null;
};

export default BackgroundCameraService;
