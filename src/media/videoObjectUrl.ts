/** Guess a video MIME type from filename when File.type is empty/generic. */
export function videoMimeFromFilename(filename: string): string {
  const extension = filename.split(".").pop()?.toLowerCase();
  switch (extension) {
    case "webm":
      return "video/webm";
    case "mov":
      return "video/quicktime";
    case "m4v":
    case "mp4":
    default:
      return "video/mp4";
  }
}

/**
 * Create a blob URL for playback, forcing a video MIME type when the File
 * reports empty/non-video type (common with OS file pickers).
 */
export function createVideoObjectUrl(file: File): string {
  const mime =
    file.type && file.type.startsWith("video/")
      ? file.type
      : videoMimeFromFilename(file.name);

  if (file.type === mime) {
    return URL.createObjectURL(file);
  }

  return URL.createObjectURL(file.slice(0, file.size, mime));
}

/** Read MP4/MOV ftyp brands from the first bytes (codec/container sniff). */
export async function sniffMediaBrands(
  source: Blob,
): Promise<{ brands: string[]; asciiHead: string }> {
  try {
    const buf = await source.slice(0, 128).arrayBuffer();
    const bytes = new Uint8Array(buf);
    const asciiHead = Array.from(bytes.slice(0, 64), (b) =>
      b >= 32 && b < 127 ? String.fromCharCode(b) : ".",
    ).join("");

    const brands: string[] = [];
    for (let i = 0; i < bytes.length - 4; i += 1) {
      const tag = String.fromCharCode(
        bytes[i],
        bytes[i + 1],
        bytes[i + 2],
        bytes[i + 3],
      );
      if (
        tag === "ftyp" ||
        tag === "avc1" ||
        tag === "avc3" ||
        tag === "hvc1" ||
        tag === "hev1" ||
        tag === "vp09" ||
        tag === "av01" ||
        tag === "mp41" ||
        tag === "mp42" ||
        tag === "isom" ||
        tag === "qt  " ||
        tag === "M4A " ||
        tag === "M4V " ||
        tag === "apcn" ||
        tag === "apch" ||
        tag === "apcs" ||
        tag === "aic1"
      ) {
        brands.push(tag.trim());
      }
    }

    return { brands: [...new Set(brands)], asciiHead };
  } catch {
    return { brands: [], asciiHead: "" };
  }
}
