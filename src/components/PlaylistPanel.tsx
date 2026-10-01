import {
  memo,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import type { RuntimeShowMediaItem } from "../types/showMedia";
import type { Song } from "../types/song";
import { getSongDisplayName } from "../types/songSetList";
import {
  mediaIdForSong,
  orderMediaItemsByPlaylist,
} from "../showFile/mediaLibrary";
import {
  getSongStatus,
  getSongStatusIcon,
  type SongStatus,
} from "../utils/songStatus";
import SongLinkingControls, {
  SongLinkCheckbox,
} from "./SongLinkingControls";

interface PlaylistPanelProps {
  mediaItems: RuntimeShowMediaItem[];
  playlist: Song[];
  activeSongIndex: number;
  onSelectMedia: (mediaId: string) => void;
  onAddVideo: () => void | Promise<void>;
  onLinkSongs: (songIds: string[]) => boolean;
  onBreakSongLink: (songId: string) => boolean;
  onRequestDeleteSong: (songId: string) => void;
  /** Reorder by playlist index only — must not recreate song objects. */
  onReorderPlaylist: (fromIndex: number, toIndex: number) => void;
  /** Operator display name (setList.displayName) — does not rename media. */
  onDisplayNameChange: (songId: string, displayName: string) => void;
  onSongContextMenu?: (songId: string, event: MouseEvent) => void;
  directorMode: boolean;
  /** From useShowDirector — Song Linking edit UI mounts only when true. */
  editorMode: boolean;
  width: number;
}

/** Subtle, distinct tints for separate Song Link groups. */
const CHAIN_PALETTE = [
  {
    bg: "rgba(52, 110, 168, 0.2)",
    border: "rgba(88, 150, 210, 0.42)",
    accent: "rgba(96, 168, 230, 0.85)",
    connector: "rgba(96, 168, 230, 0.55)",
  },
  {
    bg: "rgba(46, 120, 98, 0.2)",
    border: "rgba(78, 160, 130, 0.42)",
    accent: "rgba(86, 175, 140, 0.85)",
    connector: "rgba(86, 175, 140, 0.55)",
  },
  {
    bg: "rgba(140, 108, 64, 0.2)",
    border: "rgba(180, 140, 84, 0.42)",
    accent: "rgba(200, 158, 96, 0.85)",
    connector: "rgba(200, 158, 96, 0.55)",
  },
  {
    bg: "rgba(88, 96, 140, 0.22)",
    border: "rgba(120, 130, 180, 0.42)",
    accent: "rgba(140, 150, 200, 0.85)",
    connector: "rgba(140, 150, 200, 0.55)",
  },
  {
    bg: "rgba(120, 72, 88, 0.2)",
    border: "rgba(170, 110, 125, 0.42)",
    accent: "rgba(190, 125, 140, 0.85)",
    connector: "rgba(190, 125, 140, 0.55)",
  },
] as const;

function songIdsInChain(playlist: Song[]): Set<string> {
  const ids = new Set<string>();
  for (const song of playlist) {
    if (song.link?.nextSongId) {
      ids.add(song.id);
      ids.add(song.link.nextSongId);
    }
  }
  return ids;
}

function assignChainGroups(playlist: Song[]): Map<string, number> {
  const adjacency = new Map<string, Set<string>>();

  const ensure = (id: string) => {
    if (!adjacency.has(id)) adjacency.set(id, new Set());
  };

  for (const song of playlist) {
    const nextId = song.link?.nextSongId;
    if (!nextId) continue;
    ensure(song.id);
    ensure(nextId);
    adjacency.get(song.id)!.add(nextId);
    adjacency.get(nextId)!.add(song.id);
  }

  const groupBySongId = new Map<string, number>();
  let groupIndex = 0;

  for (const song of playlist) {
    if (!adjacency.has(song.id) || groupBySongId.has(song.id)) continue;

    const stack = [song.id];
    groupBySongId.set(song.id, groupIndex);

    while (stack.length > 0) {
      const current = stack.pop()!;
      for (const neighbor of adjacency.get(current) ?? []) {
        if (groupBySongId.has(neighbor)) continue;
        groupBySongId.set(neighbor, groupIndex);
        stack.push(neighbor);
      }
    }

    groupIndex += 1;
  }

  return groupBySongId;
}

function resolveSongForMediaItem(
  item: RuntimeShowMediaItem,
  songsByMediaId: Map<string, Song>,
  playlist: Song[],
): Song | undefined {
  const byId = songsByMediaId.get(item.id);
  if (byId) return byId;

  const filename = item.filename.toLowerCase();
  return playlist.find(
    (song) => song.videoFilename.toLowerCase() === filename,
  );
}

function linkTooltipForSong(
  song: Song,
  songsById: Map<string, Song>,
): string {
  const nextId = song.link?.nextSongId;
  if (!nextId) return "End of Song Link";

  const nextSong = songsById.get(nextId);
  if (!nextSong) return "End of Song Link";

  return `Linked to: ${getSongDisplayName(nextSong)}`;
}

function PlaylistPanel({
  mediaItems,
  playlist,
  activeSongIndex,
  onSelectMedia,
  onAddVideo,
  onLinkSongs,
  onBreakSongLink,
  onRequestDeleteSong,
  onReorderPlaylist,
  onDisplayNameChange,
  onSongContextMenu,
  directorMode,
  editorMode,
  width,
}: PlaylistPanelProps) {
  const [selectedSongIds, setSelectedSongIds] = useState<string[]>([]);
  const [dragFromIndex, setDragFromIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [editingSongId, setEditingSongId] = useState<string | null>(null);
  const [titleDraft, setTitleDraft] = useState("");
  const titleInputRef = useRef<HTMLInputElement>(null);
  const editingSongIdRef = useRef<string | null>(null);

  const canReorder = editorMode && !directorMode;
  const canEditTitle = editorMode && !directorMode;

  useEffect(() => {
    if (!editorMode) {
      setSelectedSongIds([]);
      setDragFromIndex(null);
      setDragOverIndex(null);
      editingSongIdRef.current = null;
      setEditingSongId(null);
      setTitleDraft("");
    }
  }, [editorMode]);

  useEffect(() => {
    if (!editingSongId) return;
    const input = titleInputRef.current;
    if (!input) return;
    input.focus();
    input.select();
  }, [editingSongId]);

  useEffect(() => {
    const playlistIds = new Set(playlist.map((song) => song.id));
    setSelectedSongIds((previous) =>
      previous.filter((id) => playlistIds.has(id)),
    );
  }, [playlist]);

  const orderedMediaItems = useMemo(
    () => orderMediaItemsByPlaylist(mediaItems, playlist),
    [mediaItems, playlist],
  );

  const songsByMediaId = useMemo(() => {
    const map = new Map<string, Song>();
    for (const song of playlist) {
      map.set(mediaIdForSong(song), song);
    }
    return map;
  }, [playlist]);

  const songsById = useMemo(() => {
    const map = new Map<string, Song>();
    for (const song of playlist) {
      map.set(song.id, song);
    }
    return map;
  }, [playlist]);

  const playlistIndexBySongId = useMemo(() => {
    const map = new Map<string, number>();
    playlist.forEach((song, index) => {
      map.set(song.id, index);
    });
    return map;
  }, [playlist]);

  const chainedSongIds = useMemo(() => songIdsInChain(playlist), [playlist]);
  const chainGroups = useMemo(() => assignChainGroups(playlist), [playlist]);

  const selectedInPlaylist = useMemo(
    () =>
      playlist
        .filter((song) => selectedSongIds.includes(song.id))
        .map((song) => song.id),
    [playlist, selectedSongIds],
  );

  const canLink = selectedInPlaylist.length >= 2;
  const canBreak = selectedInPlaylist.some((id) => chainedSongIds.has(id));

  const toggleSongSelection = (songId: string) => {
    setSelectedSongIds((previous) =>
      previous.includes(songId)
        ? previous.filter((id) => id !== songId)
        : [...previous, songId],
    );
  };

  const handleLinkSongs = () => {
    if (!canLink) return;
    if (onLinkSongs(selectedInPlaylist)) {
      setSelectedSongIds([]);
    }
  };

  const handleBreakLinks = () => {
    if (!canBreak) return;
    for (const songId of selectedInPlaylist) {
      onBreakSongLink(songId);
    }
    setSelectedSongIds([]);
  };

  const clearDragState = () => {
    setDragFromIndex(null);
    setDragOverIndex(null);
  };

  const handleDragStart =
    (playlistIndex: number) => (event: DragEvent) => {
      if (!canReorder) {
        event.preventDefault();
        return;
      }
      setDragFromIndex(playlistIndex);
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", String(playlistIndex));
    };

  const handleDragOver =
    (playlistIndex: number) => (event: DragEvent) => {
      if (!canReorder || dragFromIndex === null) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      if (dragOverIndex !== playlistIndex) {
        setDragOverIndex(playlistIndex);
      }
    };

  const handleDrop =
    (playlistIndex: number) => (event: DragEvent) => {
      event.preventDefault();
      if (!canReorder) return;

      const from =
        dragFromIndex ??
        Number.parseInt(event.dataTransfer.getData("text/plain"), 10);

      clearDragState();

      if (!Number.isFinite(from) || from === playlistIndex) return;
      onReorderPlaylist(from, playlistIndex);
    };

  const beginTitleEdit = (song: Song) => {
    if (!canEditTitle) return;
    editingSongIdRef.current = song.id;
    setEditingSongId(song.id);
    setTitleDraft(getSongDisplayName(song));
  };

  const cancelTitleEdit = () => {
    editingSongIdRef.current = null;
    setEditingSongId(null);
    setTitleDraft("");
  };

  const commitTitleEdit = (song: Song) => {
    if (editingSongIdRef.current !== song.id) return;
    const next = titleDraft.trim();
    const current = getSongDisplayName(song);
    editingSongIdRef.current = null;
    setEditingSongId(null);
    setTitleDraft("");
    if (next === current) return;
    onDisplayNameChange(song.id, next);
  };

  const handleTitleKeyDown =
    (song: Song) => (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") {
        event.preventDefault();
        event.stopPropagation();
        commitTitleEdit(song);
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        cancelTitleEdit();
      }
    };

  return (
    <aside
      className="playlist-panel"
      style={{ width, flex: `0 0 ${width}px` }}
    >
      <div className="playlist-header">
        <h2 className="playlist-header__title">Media / Songs</h2>
        {orderedMediaItems.length > 0 && (
          <p className="playlist-header__progress">
            {orderedMediaItems.length}{" "}
            {orderedMediaItems.length === 1 ? "video" : "videos"}
          </p>
        )}
      </div>

      <button
        type="button"
        className="playlist-add-video"
        disabled={directorMode}
        onClick={() => void onAddVideo()}
      >
        + Add Video
      </button>

      {editorMode && (
        <SongLinkingControls
          canLink={canLink}
          canBreak={canBreak}
          onLinkSongs={handleLinkSongs}
          onBreakLinks={handleBreakLinks}
        />
      )}

      {orderedMediaItems.length === 0 ? (
        <p className="playlist-empty">No videos in library</p>
      ) : (
        <ul
          className={`playlist-list${editorMode ? "" : " playlist-list--live"}${canReorder ? " playlist-list--reorderable" : ""}`}
          onDragEnd={clearDragState}
        >
          {orderedMediaItems.map((item, index) => {
            const song = resolveSongForMediaItem(
              item,
              songsByMediaId,
              playlist,
            );
            const playlistIndex =
              song !== undefined ? playlistIndexBySongId.get(song.id) : undefined;
            const isActive =
              playlistIndex !== undefined &&
              playlistIndex === activeSongIndex;
            // Completion progress is Live Show only — never while programming.
            const status: SongStatus | null =
              !editorMode && playlistIndex !== undefined
                ? getSongStatus(playlistIndex, activeSongIndex)
                : null;
            const isSelected = Boolean(
              song && selectedSongIds.includes(song.id),
            );
            const isLinked = song ? chainedSongIds.has(song.id) : false;
            const chainGroup =
              song && isLinked ? chainGroups.get(song.id) : undefined;
            const palette =
              chainGroup !== undefined
                ? CHAIN_PALETTE[chainGroup % CHAIN_PALETTE.length]
                : undefined;

            const nextItem = orderedMediaItems[index + 1];
            const nextSong = nextItem
              ? resolveSongForMediaItem(nextItem, songsByMediaId, playlist)
              : undefined;
            const connectsToNext = Boolean(
              song?.link?.nextSongId &&
                nextSong &&
                song.link.nextSongId === nextSong.id,
            );

            const linkTooltip =
              song && isLinked
                ? linkTooltipForSong(song, songsById)
                : undefined;
            const cueCount = song?.cues.length ?? 0;
            const displayName = song
              ? getSongDisplayName(song)
              : item.filename;
            const isEditingTitle = Boolean(
              song && editingSongId === song.id,
            );
            const canDragSong =
              canReorder && playlistIndex !== undefined;
            const isDragging =
              playlistIndex !== undefined && dragFromIndex === playlistIndex;
            const isDropTarget =
              playlistIndex !== undefined &&
              dragOverIndex === playlistIndex &&
              dragFromIndex !== null &&
              dragFromIndex !== playlistIndex;

            const rowTitle = [
              linkTooltip,
              song ? `Media: ${item.filename}` : undefined,
            ]
              .filter(Boolean)
              .join(" · ");

            const chainStyle = palette
              ? ({
                  "--chain-bg": palette.bg,
                  "--chain-border": palette.border,
                  "--chain-accent": palette.accent,
                  "--chain-connector": palette.connector,
                } as CSSProperties)
              : undefined;

            return (
              <li
                key={item.id}
                className={`playlist-list__item${
                  connectsToNext ? " playlist-list__item--connects" : ""
                }${isLinked ? " playlist-list__item--linked" : ""}${
                  isDragging ? " playlist-list__item--dragging" : ""
                }${isDropTarget ? " playlist-list__item--drop-target" : ""}`}
                style={chainStyle}
                onDragOver={
                  playlistIndex !== undefined
                    ? handleDragOver(playlistIndex)
                    : undefined
                }
                onDrop={
                  playlistIndex !== undefined
                    ? handleDrop(playlistIndex)
                    : undefined
                }
              >
                <div
                  className={`playlist-item-row${isSelected ? " playlist-item-row--selected" : ""}${isLinked ? " playlist-item-row--linked" : ""}`}
                  onContextMenu={
                    song && onSongContextMenu
                      ? (event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          onSongContextMenu(song.id, event);
                        }
                      : undefined
                  }
                >
                  {canDragSong ? (
                    <button
                      type="button"
                      className="playlist-item__drag"
                      draggable
                      aria-label={`Drag to reorder song ${playlistIndex + 1}`}
                      title="Drag to reorder"
                      onDragStart={handleDragStart(playlistIndex)}
                      onDragEnd={clearDragState}
                    >
                      <span aria-hidden="true">⋮⋮</span>
                    </button>
                  ) : null}
                  {playlistIndex !== undefined ? (
                    <span
                      className="playlist-item__number"
                      aria-label={`Song ${playlistIndex + 1}`}
                    >
                      {playlistIndex + 1}.
                    </span>
                  ) : null}
                  {editorMode && (
                    <SongLinkCheckbox
                      checked={isSelected}
                      disabled={!song}
                      onToggle={() => {
                        if (!song) return;
                        toggleSongSelection(song.id);
                      }}
                    />
                  )}
                  <div
                    className={`playlist-item${status ? ` playlist-item--${status}` : ""}${isActive ? " active" : ""}${isLinked ? " playlist-item--linked" : ""}${
                      directorMode ? " playlist-item--disabled" : ""
                    }`}
                    role="button"
                    tabIndex={directorMode ? -1 : 0}
                    aria-current={isActive ? "true" : undefined}
                    aria-disabled={directorMode || undefined}
                    title={rowTitle || undefined}
                    onClick={() => {
                      if (directorMode || isEditingTitle) return;
                      onSelectMedia(item.id);
                    }}
                    onKeyDown={(event) => {
                      if (directorMode || isEditingTitle) return;
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onSelectMedia(item.id);
                      }
                    }}
                  >
                    <span className="playlist-item__icon" aria-hidden="true">
                      {status ? getSongStatusIcon(status) : "🎥"}
                    </span>
                    <span className="playlist-item__text">
                      {isEditingTitle && song ? (
                        <input
                          ref={titleInputRef}
                          type="text"
                          className="playlist-item__title-input"
                          value={titleDraft}
                          aria-label="Edit song display name"
                          onChange={(event) =>
                            setTitleDraft(event.target.value)
                          }
                          onClick={(event) => event.stopPropagation()}
                          onKeyDown={handleTitleKeyDown(song)}
                          onBlur={() => commitTitleEdit(song)}
                        />
                      ) : (
                        <span
                          className={`playlist-item__title${
                            canEditTitle && song
                              ? " playlist-item__title--editable"
                              : ""
                          }`}
                          onDoubleClick={
                            song && canEditTitle
                              ? (event) => {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  beginTitleEdit(song);
                                }
                              : undefined
                          }
                        >
                          {displayName}
                          {isActive ? (
                            <span className="playlist-item__active-label">
                              {" "}
                              (active)
                            </span>
                          ) : null}
                        </span>
                      )}
                    </span>
                    <span className="playlist-item__cue-count">
                      {cueCount} {cueCount === 1 ? "cue" : "cues"}
                    </span>
                    {isLinked ? (
                      <span
                        className="playlist-item__link-badge"
                        title={linkTooltip}
                        aria-label={linkTooltip}
                      >
                        🔗
                      </span>
                    ) : null}
                  </div>
                  {editorMode && song ? (
                    <button
                      type="button"
                      className="playlist-item__delete"
                      aria-label={`Delete ${getSongDisplayName(song)} from show`}
                      title="Delete Song"
                      onClick={() => onRequestDeleteSong(song.id)}
                    >
                      Delete
                    </button>
                  ) : null}
                </div>
                {connectsToNext ? (
                  <div
                    className="playlist-link-connector"
                    aria-hidden="true"
                  />
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}

export default memo(PlaylistPanel);
