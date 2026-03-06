import React, { useState, useEffect } from 'react';

const VideoPlayer = ({
  currentLesson,
  aiVideoUrl,
  isAIVideoLoading,
  selectedCelebrity,
  celebrityVideoMap,
  activeCaption,
  playerContainerRef,
  videoRef,
  handleProgress,
  getYouTubeVideoId,
  setYtPlayer
}) => {
  const [isBuffering, setIsBuffering] = useState(false);

  const handlePlayStart = () => {
    setIsBuffering(true);
    setTimeout(() => {
      setIsBuffering(false);
    }, 2000); // 2 second loading effect for normal play
  };

  useEffect(() => {
    const videoElement = videoRef?.current;
    if (videoElement) {
      videoElement.addEventListener('play', handlePlayStart);
      return () => {
        videoElement.removeEventListener('play', handlePlayStart);
      };
    }
  }, [videoRef]);

  // YouTube Player Initialization
  useEffect(() => {
    if (currentLesson?.youtubeUrl && !selectedCelebrity && !aiVideoUrl) {
      const videoId = getYouTubeVideoId(currentLesson.youtubeUrl);
      if (!videoId) return;

      let player;
      const initPlayer = () => {
        if (window.YT && window.YT.Player) {
          player = new window.YT.Player('youtube-player', {
            videoId: videoId,
            playerVars: {
              autoplay: 1,
              controls: 0,
              modestbranding: 1,
              rel: 0,
              showinfo: 0,
              iv_load_policy: 3
            },
            events: {
              onReady: (event) => {
                setYtPlayer(event.target);
              },
            }
          });
        }
      };

      if (window.YT && window.YT.Player) {
        initPlayer();
      } else {
        window.onYouTubeIframeAPIReady = initPlayer;
      }

      return () => {
        if (player && typeof player.destroy === 'function') {
          player.destroy();
          setYtPlayer(null);
        }
      };
    } else {
      setYtPlayer(null);
    }
  }, [currentLesson?.id, selectedCelebrity, aiVideoUrl]);

  return (
    <div className="xl:col-span-2">
      <div
        ref={playerContainerRef}
        className="relative bg-black rounded-lg overflow-hidden group"
        style={{ aspectRatio: "16/9" }}
      >
        {/* Video / Iframe */}
        {(aiVideoUrl || isAIVideoLoading || selectedCelebrity) ? (
          <video
            ref={videoRef}
            src={
              aiVideoUrl ||
              (selectedCelebrity &&
                celebrityVideoMap[selectedCelebrity]?.video) ||
              currentLesson?.videoUrl
            }
            className="w-full h-full object-contain bg-black"
            onTimeUpdate={handleProgress}
            onLoadedMetadata={handleProgress}
            controls={false}
            playsInline
          />
        ) : currentLesson?.youtubeUrl ? (
          <div className="w-full h-full">
            <div id="youtube-player" className="w-full h-full"></div>
          </div>
        ) : (
          <video
            ref={videoRef}
            src={currentLesson?.videoUrl}
            className="w-full h-full object-contain bg-black"
            onTimeUpdate={handleProgress}
            onLoadedMetadata={handleProgress}
            controls={false}
            playsInline
          />
        )}

        {/* Loading Overlay */}
        {(isBuffering || isAIVideoLoading) && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-10 transition-opacity">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4"></div>
              <p className="text-white text-lg font-medium">
                {isAIVideoLoading ? "🚀 Generating AI Video..." : "Loading video..."}
              </p>
              {isAIVideoLoading && (
                <p className="text-gray-300 text-sm mt-2 max-w-xs text-center">
                  This might take a minute as our AI models create your personalized mentor video.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Caption Overlay */}
        {activeCaption && (
          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-md text-sm">
            {activeCaption}
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoPlayer;