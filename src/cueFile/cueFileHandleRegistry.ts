export function createCueFileHandleRegistry() {
  const handles = new Map<string, FileSystemFileHandle>();

  return {
    clear() {
      handles.clear();
    },
    set(songId: string, handle: FileSystemFileHandle) {
      handles.set(songId.toLowerCase(), handle);
    },
    get(songId: string) {
      return handles.get(songId.toLowerCase());
    },
    replaceAll(nextHandles: Map<string, FileSystemFileHandle>) {
      handles.clear();
      for (const [songId, handle] of nextHandles) {
        handles.set(songId.toLowerCase(), handle);
      }
    },
  };
}

export type CueFileHandleRegistry = ReturnType<typeof createCueFileHandleRegistry>;
