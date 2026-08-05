import { memo } from "react";
import type { ShowInfo } from "../types/showInfo";
import type { Song } from "../types/song";
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
  readOnly = false,
}: SetListPageProps) {
  return (
    <div
      className={`set-list-page${showCompletion ? " set-list-page--progress" : ""}`}
    >
      <section className="set-list-page__meta" aria-label="Show information">
        <label className="set-list-page__meta-row">
          <span className="set-list-page__meta-label">Artist</span>
          <input
            type="text"
            className="set-list-page__meta-input"
            value={showInfo.artist}
            placeholder="Artist"
            disabled={readOnly}
            onChange={(event) => onShowInfoChange("artist", event.target.value)}
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
            onChange={(event) => onShowInfoChange("venue", event.target.value)}
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

      <section className="set-list-page__songs" aria-label="Set list">
        {playlist.length === 0 ? (
          <p className="set-list-page__empty">No songs in the set list.</p>
        ) : (
          <ol className="set-list-page__list">
            {playlist.map((song, index) => {
              const parts = song.setList?.parts ?? [];
              const status = showCompletion
                ? getSongStatus(index, activeSongIndex)
                : null;

              return (
                <li
                  key={song.id}
                  className={
                    status
                      ? `set-list-page__item set-list-page__item--${status}`
                      : "set-list-page__item"
                  }
                  aria-current={status === "current" ? "true" : undefined}
                >
                  <div className="set-list-page__song">
                    {status ? (
                      <span
                        className="set-list-page__status"
                        aria-hidden="true"
                      >
                        {getSongStatusIcon(status)}
                      </span>
                    ) : null}
                    <span className="set-list-page__number">{index + 1}.</span>
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
                  </div>

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
