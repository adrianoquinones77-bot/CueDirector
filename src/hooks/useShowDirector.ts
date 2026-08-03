import { type ChangeEvent, useCallback, useEffect, useState } from "react";
import { buildPlaylistFromFiles, revokePlaylistUrls } from "../buildPlaylist";
import { demoCues } from "../demoCues";
import type { Cue } from "../types/cue";
import type { Song } from "../types/song";

export function useShowDirector() {
  const [currentTime, setCurrentTime] = useState(0);
  const [cues, setCues] = useState<Cue[]>(demoCues);
  const [playlist, setPlaylist] = useState<Song[]>([]);
  const [activeSongIndex, setActiveSongIndex] = useState(-1);
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [directorMode, setDirectorMode] = useState(false);

  const activeSong = activeSongIndex >= 0 ? playlist[activeSongIndex] : undefined;

  const selectSong = useCallback(
    (index: number) => {
      const song = playlist[index];
      if (!song) return;

      setActiveSongIndex(index);
      setCues(song.cues);
      setCurrentTime(0);
    },
    [playlist],
  );

  useEffect(() => {
    return () => revokePlaylistUrls(playlist);
  }, [playlist]);

  const loadShow = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (!files || files.length === 0) return;

      revokePlaylistUrls(playlist);

      const songs = await buildPlaylistFromFiles(files);
      if (songs.length === 0) return;

      setPlaylist(songs);
      setActiveSongIndex(0);
      setCues(songs[0].cues);
      setCurrentTime(0);
    },
    [playlist],
  );

  const goToPreviousSong = useCallback(() => {
    if (activeSongIndex > 0) {
      selectSong(activeSongIndex - 1);
    }
  }, [activeSongIndex, selectSong]);

  const goToNextSong = useCallback(() => {
    if (activeSongIndex >= 0 && activeSongIndex < playlist.length - 1) {
      selectSong(activeSongIndex + 1);
    }
  }, [activeSongIndex, playlist.length, selectSong]);

  const handleTimeUpdate = useCallback((time: number) => {
    setCurrentTime(time);
  }, []);

  const advanceOnVideoEnd = useCallback(() => {
    if (!autoAdvance) return false;
    if (activeSongIndex >= 0 && activeSongIndex < playlist.length - 1) {
      selectSong(activeSongIndex + 1);
      return true;
    }
    return false;
  }, [autoAdvance, activeSongIndex, playlist.length, selectSong]);

  return {
    currentTime,
    cues,
    playlist,
    activeSongIndex,
    activeVideoSrc: activeSong?.videoUrl,
    autoAdvance,
    setAutoAdvance,
    directorMode,
    setDirectorMode,
    selectSong,
    loadShow,
    goToPreviousSong,
    goToNextSong,
    handleTimeUpdate,
    advanceOnVideoEnd,
    canGoPrevious: activeSongIndex > 0,
    canGoNext: activeSongIndex >= 0 && activeSongIndex < playlist.length - 1,
  };
}
