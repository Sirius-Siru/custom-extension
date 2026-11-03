let lastYoutubeTarget = null;

function getYoutubeTargetFromElement(element) {
  const anchor = element && element.closest && element.closest("a[href]");
  if (!anchor) return null;

  let url;
  try {
    url = new URL(anchor.href, location.href);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, "");
  const isYoutube = host === "youtube.com" || host.endsWith(".youtube.com");
  const isShort = host === "youtu.be";
  if (!isYoutube && !isShort) return null;

  if (url.searchParams.has("v") || url.searchParams.has("list") || url.pathname.startsWith("/shorts/")) {
    return url.toString();
  }

  return null;
}

function rememberTarget(event) {
  const target = getYoutubeTargetFromElement(event.target);
  if (target) lastYoutubeTarget = target;
}

document.addEventListener("pointerover", rememberTarget, { capture: true, passive: true });
document.addEventListener("focusin", rememberTarget, { capture: true, passive: true });
document.addEventListener("contextmenu", rememberTarget, { capture: true, passive: true });

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.type === "get-youtube-target") {
    const activeTarget = getYoutubeTargetFromElement(document.activeElement);
    sendResponse({ url: activeTarget || lastYoutubeTarget || null });
  }
});
