import fs from "node:fs";
import { pathToFileURL } from "node:url";
import { net, protocol } from "electron";

export const MEDIA_SCHEME = "cdmedia";
const MEDIA_LOG = "[CueDirector media]";

export function registerMediaScheme(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: MEDIA_SCHEME,
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        stream: true,
        corsEnabled: true,
      },
    },
  ]);
}

export function installMediaProtocolHandler(): void {
  protocol.handle(MEDIA_SCHEME, (request) => {
    const filePath = decodeURIComponent(
      request.url.replace(new RegExp(`^${MEDIA_SCHEME}:\\/\\/local\\/`), ""),
    );
    const exists = fs.existsSync(filePath);

    console.log(`${MEDIA_LOG} protocol fetch`, {
      requestUrl: request.url,
      filePath,
      exists,
    });

    if (!exists) {
      return new Response("Not found", { status: 404 });
    }

    return net.fetch(pathToFileURL(filePath).href);
  });
}

export function absolutePathToMediaUrl(filePath: string): string {
  const exists = fs.existsSync(filePath);
  const fileUrl = pathToFileURL(filePath).href;
  const mediaUrl = `${MEDIA_SCHEME}://local/${encodeURIComponent(filePath)}`;

  console.log(`${MEDIA_LOG} path conversion`, {
    filePath,
    exists,
    fileUrl,
    mediaUrl,
  });

  return mediaUrl;
}
