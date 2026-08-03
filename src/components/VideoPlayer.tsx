import { useEffect, useRef } from "react";

interface VideoPlayerProps {
  src?: string;
  onTimeUpdate: (time: number) => void;
}

export default function VideoPlayer({ src, onTimeUpdate }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    video.load();
    video.currentTime = 0;
  }, [src]);

  return (
    <section className="video-panel">
      <video
        ref={videoRef}
        src={src}
        controls
        onTimeUpdate={() => {
          if (videoRef.current) {
            onTimeUpdate(videoRef.current.currentTime);
          }
        }}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          objectPosition: "center",
          backgroundColor: "#000",
        }}
      />
    </section>
  );
}
