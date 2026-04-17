type VideoEmbed = {
  provider: "youtube" | "vimeo";
  embedUrl: string;
};

function readUrl(value: string) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

export function getVideoEmbed(videoUrl: string): VideoEmbed | null {
  const url = readUrl(videoUrl.trim());

  if (!url) {
    return null;
  }

  const host = url.hostname.replace(/^www\./, "");

  if (host === "youtube.com" || host === "m.youtube.com") {
    const id = url.searchParams.get("v");
    return id ? { provider: "youtube", embedUrl: `https://www.youtube.com/embed/${id}` } : null;
  }

  if (host === "youtu.be") {
    const id = url.pathname.replace(/^\/+/, "");
    return id ? { provider: "youtube", embedUrl: `https://www.youtube.com/embed/${id}` } : null;
  }

  if (host === "vimeo.com") {
    const id = url.pathname.replace(/^\/+/, "");
    return id ? { provider: "vimeo", embedUrl: `https://player.vimeo.com/video/${id}` } : null;
  }

  return null;
}

export function isSupportedVideoUrl(videoUrl: string) {
  return getVideoEmbed(videoUrl) !== null;
}
