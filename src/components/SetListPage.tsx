import {
  memo,
  useEffect,
  useState,
  type DragEvent,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import type { ShowInfo } from "../types/showInfo";
import type { Song } from "../types/song";
import { songHasMedia } from "../types/songSetList";
import {
  getSongStatus,
  getSongStatusIcon,
} from "../utils/songStatus";

interface SetListPageProps {
  showInfo: ShowInfo;
  playlist: Song[];
  activeSongIndex: number;
  /** Completion visuals (strike / current / upcoming) — Live Show only. */
  showCompletion?: boolean;
  onShowInfoChange: (field: keyof ShowInfo, value: string) => void;
  onDisplayNameChange: (songId: string, displayName: string) => void;
  onMedleyPartsChange: (songId: string, parts: string[]) => void;
  onReorderPlaylist: (fromIndex: number, toIndex: number) => void;
  onMoveSongToPosition: (songId: string, position: number) => void;
  onAddManualSong: () => void;
  readOnly?: boolean;
}

function SetListPage({
  showInfo,
  playlist,
  activeSongIndex,
  showCompletion = false,
  onShowInfoChange,
  onDisplayNameChange,
  onMedleyPartsChange,
  onReorderPlaylist,
  onMoveSongToPosition,
  onAddManualSong,
  readOnly = false,
}: SetListPageProps) {
  const [dragFromIndex, setDragFromIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [numberDrafts, setNumberDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    setNumberDrafts({});
  }, [playlist]);

  const commitPosition = (songId: string, currentIndex: number) => {
    const draft = numberDrafts[songId];
    setNumberDrafts((previous) => {
      const next = { ...previous };
      delete next[songId];
      return next;
    });

    if (draft === undefined) return;

    const parsed = Number.parseInt(draft, 10);
    if (!Number.isFinite(parsed)) return;
    if (parsed === currentIndex + 1) return;

    onMoveSongToPosition(songId, parsed);
  };

  const handleDragStart = (index: number) => (event: DragEvent) => {
    if (readOnly) {
      event.preventDefault();
      return;
    }
    setDragFromIndex(index);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(index));
  };

  const handleDragOver = (index: number) => (event: DragEvent) => {
    if (readOnly || dragFromIndex === null) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (index: number) => (event: DragEvent) => {
    event.preventDefault();
    if (readOnly) return;

    const from =
      dragFromIndex ??
      Number.parseInt(event.dataTransfer.getData("text/plain"), 10);

    setDragFromIndex(null);
    setDragOverIndex(null);

    if (!Number.isFinite(from) || from === index) return;
    onReorderPlaylist(from, index);
  };

  const clearDragState = () => {
    setDragFromIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div
      className={`set-list-page${showCompletion ? " set-list-page--progress" : ""}${
        !readOnly ? " set-list-page--editable" : ""
      }`}
    >
      <header className="set-list-page__header">
        <section className="set-list-page__meta" aria-label="Show information">
          <label className="set-list-page__meta-row">
            <span className="set-list-page__meta-label">Artist</span>
            <input
              type="text"
              className="set-list-page__meta-input"
              value={showInfo.artist}
              placeholder="Artist"
              disabled={readOnly}
              onChange={(event) =>
                onShowInfoChange("artist", event.target.value)
              }
            />
          </label>
          <label className="set-list-page__meta-row">
            <span className="set-list-page__meta-label">Venue</span>
            <input
              type="text"
              className="set-list-page__meta-input"
              value={showInfo.venue}
              placeholder="Venue"
              disabled={readOnly}
              onChange={(event) =>
                onShowInfoChange("venue", event.target.value)
              }
            />
          </label>
          <label className="set-list-page__meta-row">
            <span className="set-list-page__meta-label">City</span>
            <input
              type="text"
              className="set-list-page__meta-input"
              value={showInfo.city}
              placeholder="City"
              disabled={readOnly}
              onChange={(event) => onShowInfoChange("city", event.target.value)}
            />
          </label>
        </section>

        <hr className="set-list-page__rule" />

        {!readOnly && (
          <div className="set-list-page__toolbar">
            <button
              type="button"
              className="set-list-page__add-song"
              onClick={onAddManualSong}
            >
              + Add Song
            </button>
          </div>
        )}
      </header>

      <section className="set-list-page__songs" aria-label="Set list">
        {playlist.length === 0 ? (
          <p className="set-list-page__empty">No songs in the set list.</p>
        ) : (
          <ol className="set-list-page__list" onDragEnd={clearDragState}>
            {playlist.map((song, index) => {
              const parts = song.setList?.parts ?? [];
              const notes = song.setList?.notes?.trim() ?? "";
              const hasMedia = songHasMedia(song);
              const status = showCompletion
                ? getSongStatus(index, activeSongIndex)
                : null;
              const numberValue =
                numberDrafts[song.id] ?? String(index + 1);
              const isDragging = dragFromIndex === index;
              const isDropTarget =
                dragOverIndex === index && dragFromIndex !== index;

              return (
                <li
                  key={song.id}
                  className={[
                    "set-list-page__item",
                    status ? `set-list-page__item--${status}` : "",
                    !hasMedia ? "set-list-page__item--manual" : "",
                    isDragging ? "set-list-page__item--dragging" : "",
                    isDropTarget ? "set-list-page__item--drop-target" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  aria-current={status === "current" ? "true" : undefined}
                  onDragOver={handleDragOver(index)}
                  onDrop={handleDrop(index)}
                >
                  <div className="set-list-page__song">
                    {!readOnly && (
                      <button
                        type="button"
                        className="set-list-page__drag"
                        draggable
                        aria-label={`Drag to reorder song ${index + 1}`}
                        title="Drag to reorder"
                        onDragStart={handleDragStart(index)}
                        onDragEnd={clearDragState}
                      >
                        <span aria-hidden="true">⋮⋮</span>
                      </button>
                    )}
                    {status ? (
                      <span
                        className="set-list-page__status"
                        aria-hidden="true"
                      >
                        {getSongStatusIcon(status)}
                      </span>
                    ) : null}
                    {readOnly ? (
                      <span className="set-list-page__number">
                        {index + 1}.
                      </span>
                    ) : (
                      <form
                        className="set-list-page__number-form"
                        onSubmit={(event: FormEvent) => {
                          event.preventDefault();
                          commitPosition(song.id, index);
                        }}
                      >
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          className="set-list-page__number-input"
                          value={numberValue}
                          aria-label={`Show position for ${
                            song.setList?.displayName ?? song.title
                          }`}
                          title="Edit show order number"
                          onChange={(event) => {
                            const value = event.target.value.replace(
                              /[^\d]/g,
                              "",
                            );
                            setNumberDrafts((previous) => ({
                              ...previous,
                              [song.id]: value,
                            }));
                          }}
                          onBlur={() => commitPosition(song.id, index)}
                          onKeyDown={(
                            event: KeyboardEvent<HTMLInputElement>,
                          ) => {
                            if (event.key === "Escape") {
                              setNumberDrafts((previous) => {
                                const next = { ...previous };
                                delete next[song.id];
                                return next;
                              });
                              event.currentTarget.blur();
                            }
                          }}
                        />
                        <span
                          className="set-list-page__number-dot"
                          aria-hidden="true"
                        >
                          .
                        </span>
                      </form>
                    )}
                    <input
                      type="text"
                      className="set-list-page__name"
                      value={song.setList?.displayName ?? song.title}
                      placeholder={song.title}
                      disabled={readOnly}
                      aria-label={`Song ${index + 1} display name`}
                      onChange={(event) =>
                        onDisplayNameChange(song.id, event.target.value)
                      }
                    />
                    {!hasMedia && (
                      <span
                        className="set-list-page__no-media"
                        title="No media attached"
                      >
                        <span aria-hidden="true">🎵</span>
                        <span>No Media</span>
                      </span>
                    )}
                  </div>

                  {notes ? (
                    <p className="set-list-page__notes">{notes}</p>
                  ) : null}

                  {parts.length > 0 && (
                    <ul className="set-list-page__parts">
                      {parts.map((part, partIndex) => (
                        <li key={`${song.id}-${partIndex}`}>
                          <span aria-hidden="true">•</span>
                          <input
                            type="text"
                            className="set-list-page__part"
                            value={part}
                            placeholder="Part name"
                            disabled={readOnly}
                            aria-label={`Medley part ${partIndex + 1}`}
                            onChange={(event) => {
                              const next = [...parts];
                              next[partIndex] = event.target.value;
                              onMedleyPartsChange(song.id, next);
                            }}
                          />
                        </li>
                      ))}
                    </ul>
                  )}

                  {!readOnly && (
                    <button
                      type="button"
                      className="set-list-page__add-part"
                      onClick={() =>
                        onMedleyPartsChange(song.id, [...parts, ""])
                      }
                    >
                      + Part
                    </button>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}

export default memo(SetListPage);
