
import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';

interface YouTubePlayerProps {
  videoId: string;
}

export interface YouTubePlayerHandle {
  seekTo: (seconds: number) => void;
  getCurrentTime: () => Promise<number>;
}

const YouTubePlayer = forwardRef<YouTubePlayerHandle, YouTubePlayerProps>(({ videoId }, ref) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const currentTimeRef = useRef<number>(0);

  useEffect(() => {
    // Listen for messages from the YouTube Iframe API to track time
    const handleMessage = (event: MessageEvent) => {
      if (event.source === iframeRef.current?.contentWindow) {
        try {
            const data = JSON.parse(event.data);
            if (data.event === 'infoDelivery' && data.info && data.info.currentTime) {
                currentTimeRef.current = data.info.currentTime;
            }
        } catch (e) {
            // Ignore parse errors
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  useImperativeHandle(ref, () => ({
    seekTo: (seconds: number) => {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func: 'seekTo', args: [seconds, true] }), 
          '*'
        );
      }
    },
    getCurrentTime: async () => {
        // Return tracked time. 
        // Note: For a strictly accurate time, we'd need the full YT Player API object, 
        // but this approximate tracking via postMessage listener is usually sufficient for context generation.
        return currentTimeRef.current;
    }
  }));

  return (
    <div className="w-full aspect-video rounded-xl overflow-hidden shadow-2xl border border-slate-700/50 bg-black relative group">
      <iframe
        ref={iframeRef}
        className="w-full h-full"
        src={`https://www.youtube.com/embed/${videoId}?enablejsapi=1&modestbranding=1&rel=0`}
        title="YouTube video player"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      ></iframe>
    </div>
  );
});

export default YouTubePlayer;
