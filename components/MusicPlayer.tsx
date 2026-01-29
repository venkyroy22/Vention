import React, { useState, useRef, useEffect } from 'react';
import { Track } from '../api/music';
import { useTheme } from '../context/ThemeContext';

interface MusicPlayerProps {
  currentTrack: Track | null;
  playlist: Track[];
  isPlaying: boolean;
  onPlayPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onSeek: (time: number) => void;
  onVolumeChange: (volume: number) => void;
  onClose?: () => void;
}

const MusicPlayer: React.FC<MusicPlayerProps> = ({
  currentTrack,
  playlist,
  isPlaying,
  onPlayPause,
  onNext,
  onPrevious,
  onSeek,
  onVolumeChange,
  onClose
}) => {
  const { theme } = useTheme();
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [showVolume, setShowVolume] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (!audioRef.current || !currentTrack) return;

    if (isPlaying) {
      audioRef.current.play().catch(err => console.error('Playback failed:', err));
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying, currentTrack]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleEnded = () => {
    onNext();
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
    onSeek(time);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    setVolume(vol);
    onVolumeChange(vol);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!currentTrack) return null;

  return (
    <>
      <audio
        ref={audioRef}
        src={currentTrack.audioUrl || currentTrack.previewUrl}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
      />
      
      <div className={`fixed bottom-0 left-0 right-0 border-t backdrop-blur-xl z-50 shadow-2xl transition-colors ${
        theme === 'dark'
          ? 'bg-gradient-to-t from-zinc-900 via-zinc-900/95 to-zinc-900/90 border-white/10'
          : 'bg-gradient-to-t from-white via-white/98 to-white/95 border-slate-200'
      }`}>
        <div className="max-w-screen-2xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
          {/* Progress Bar */}
          <div className="mb-2 sm:mb-3">
            <input
              type="range"
              min="0"
              max={currentTrack.duration || 100}
              value={currentTime}
              onChange={handleSeek}
              className={`w-full h-1 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-indigo-500 [&::-webkit-slider-thumb]:cursor-pointer hover:[&::-webkit-slider-thumb]:bg-indigo-400 ${
                theme === 'dark' ? 'bg-zinc-700' : 'bg-slate-300'
              }`}
            />
            <div className={`flex justify-between text-[10px] mt-1 ${
              theme === 'dark' ? 'text-zinc-500' : 'text-slate-600'
            }`}>
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(currentTrack.duration || 0)}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            {/* Track Info */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {currentTrack.coverUrl && (
                <img
                  src={currentTrack.coverUrl}
                  alt={currentTrack.title}
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl object-cover shadow-lg"
                />
              )}
              {!currentTrack.coverUrl && (
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                  <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                  </svg>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className={`font-semibold text-sm sm:text-base truncate ${
                  theme === 'dark' ? 'text-white' : 'text-slate-900'
                }`}>{currentTrack.title}</p>
                <p className={`text-xs sm:text-sm truncate ${
                  theme === 'dark' ? 'text-zinc-400' : 'text-slate-600'
                }`}>{currentTrack.artist}</p>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={onPrevious}
                className={`p-2 sm:p-2.5 rounded-xl transition-colors ${
                  theme === 'dark'
                    ? 'hover:bg-white/10 text-zinc-400 hover:text-white'
                    : 'hover:bg-slate-300 text-slate-600 hover:text-slate-900'
                }`}
                title="Previous"
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
                </svg>
              </button>

              <button
                onClick={onPlayPause}
                className="p-3 sm:p-4 bg-indigo-500 hover:bg-indigo-400 rounded-full transition-all shadow-lg shadow-indigo-500/30 active:scale-95"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 4h4v16H6zm8 0h4v16h-4z"/>
                  </svg>
                ) : (
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                )}
              </button>

              <button
                onClick={onNext}
                className={`p-2 sm:p-2.5 rounded-xl transition-colors ${
                  theme === 'dark'
                    ? 'hover:bg-white/10 text-zinc-400 hover:text-white'
                    : 'hover:bg-slate-300 text-slate-600 hover:text-slate-900'
                }`}
                title="Next"
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
                </svg>
              </button>
            </div>

            {/* Volume & Close */}
            <div className="hidden sm:flex items-center gap-2 relative">
              <button
                onClick={() => setShowVolume(!showVolume)}
                onMouseEnter={() => setShowVolume(true)}
                className={`p-2.5 rounded-xl transition-colors ${
                  theme === 'dark'
                    ? 'hover:bg-white/10 text-zinc-400 hover:text-white'
                    : 'hover:bg-slate-300 text-slate-600 hover:text-slate-900'
                }`}
                title="Volume"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  {volume === 0 ? (
                    <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
                  ) : volume < 0.5 ? (
                    <path d="M7 9v6h4l5 5V4l-5 5H7z"/>
                  ) : (
                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
                  )}
                </svg>
              </button>
              
              {showVolume && (
                <div
                  className={`absolute bottom-full mb-2 left-1/2 -translate-x-1/2 p-3 rounded-xl shadow-xl border transition-colors ${
                    theme === 'dark'
                      ? 'bg-zinc-800 border-white/10'
                      : 'bg-slate-200 border-slate-300'
                  }`}
                  onMouseLeave={() => setShowVolume(false)}
                >
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={volume}
                    onChange={handleVolumeChange}
                    className={`w-24 h-1 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-indigo-500 [&::-webkit-slider-thumb]:cursor-pointer ${
                      theme === 'dark' ? 'bg-zinc-700' : 'bg-slate-400'
                    }`}
                  />
                </div>
              )}
              
              {onClose && (
                <button
                  onClick={onClose}
                  className={`p-2.5 rounded-xl transition-colors ${
                    theme === 'dark'
                      ? 'hover:bg-white/10 text-zinc-400 hover:text-white'
                      : 'hover:bg-slate-300 text-slate-600 hover:text-slate-900'
                  }`}
                  title="Close Player"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default MusicPlayer;
