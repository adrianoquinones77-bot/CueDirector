/** Pick a CueDirector cue file (.cues / .cue) and return its text content. */

function pickCueFileViaInput(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".cues,.cue,application/json";
    input.style.display = "none";

    input.addEventListener(
      "change",
      () => {
        resolve(input.files?.[0] ?? null);
        input.remove();
      },
      { once: true },
    );

    input.addEventListener(
      "cancel",
      () => {
        resolve(null);
        input.remove();
      },
      { once: true },
    );

    document.body.appendChild(input);
    input.click();
  });
}

export async function pickAndReadCueFileContent(): Promise<string | null> {
  if (window.electronAPI?.pickOpenCueFile) {
    const filePath = await window.electronAPI.pickOpenCueFile();
    if (!filePath) return null;
    return window.electronAPI.readTextFile(filePath);
  }

  const file = await pickCueFileViaInput();
  if (!file) return null;
  return file.text();
}
