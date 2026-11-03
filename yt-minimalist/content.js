const root = document.documentElement;

function applyPageFlags() {
  const path = location.pathname;
  root.dataset.ytmPage =
    path === "/watch" ? "watch" :
    path === "/results" ? "search" :
    path === "/" ? "home" :
    "other";
}

function stopInlineMedia() {
  for (const media of document.querySelectorAll("video, audio")) {
    media.pause();
    media.removeAttribute("src");
    media.load();
  }
}

applyPageFlags();

addEventListener("yt-navigate-start", applyPageFlags, { passive: true });
addEventListener("yt-navigate-finish", () => {
  applyPageFlags();
  stopInlineMedia();
}, { passive: true });

addEventListener("DOMContentLoaded", stopInlineMedia, { once: true });
