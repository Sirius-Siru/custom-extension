const HOST_NAME = "com.hau.mpv";
const VIDEO_MENU_ID = "open-video-in-mpv";
const PLAYLIST_MENU_ID = "open-playlist-in-mpv";

const YOUTUBE_ID_RE = /(?:[?&]v=|youtu\.be\/|\/shorts\/|\/embed\/)([a-zA-Z0-9_-]{11})(?:[^\w-]|$)/;

function parseYoutubeUrl(rawUrl, preferredKind = "auto") {
  if (!rawUrl) return null;

  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, "");
  const isYoutube = host === "youtube.com" || host.endsWith(".youtube.com");
  const isShort = host === "youtu.be";
  if (!isYoutube && !isShort) return null;

  const videoId = extractVideoId(url);
  const listId = url.searchParams.get("list");

  if (preferredKind === "playlist") {
    if (!listId) return null;
    return {
      kind: "playlist",
      url: normalizePlaylistUrl(url, videoId, listId),
      videoId,
      listId,
    };
  }

  if (preferredKind === "video") {
    if (!videoId) return null;
    return {
      kind: "video",
      url: `https://www.youtube.com/watch?v=${videoId}`,
      videoId,
      listId: null,
    };
  }

  if (listId) {
    return {
      kind: "playlist",
      url: normalizePlaylistUrl(url, videoId, listId),
      videoId,
      listId,
    };
  }

  if (videoId) {
    return {
      kind: "video",
      url: `https://www.youtube.com/watch?v=${videoId}`,
      videoId,
      listId: null,
    };
  }

  return null;
}

function extractVideoId(url) {
  if (url.hostname.replace(/^www\./, "") === "youtu.be") {
    const id = url.pathname.split("/").filter(Boolean)[0];
    return /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
  }

  const id = url.searchParams.get("v");
  if (id && /^[a-zA-Z0-9_-]{11}$/.test(id)) return id;

  const match = url.href.match(YOUTUBE_ID_RE);
  return match ? match[1] : null;
}

function normalizePlaylistUrl(url, videoId, listId) {
  const normalized = new URL(videoId ? "https://www.youtube.com/watch" : "https://www.youtube.com/playlist");
  if (videoId) normalized.searchParams.set("v", videoId);
  normalized.searchParams.set("list", listId);

  const index = url.searchParams.get("index");
  if (index) normalized.searchParams.set("index", index);

  return normalized.toString();
}

function getTabTargetUrl(info, tab, preferredKind, callback) {
  const directUrl = info.linkUrl || "";
  if (parseYoutubeUrl(directUrl, preferredKind)) {
    callback(directUrl);
    return;
  }

  if (!tab || !tab.id) {
    callback(info.pageUrl || directUrl);
    return;
  }

  chrome.tabs.sendMessage(tab.id, { type: "get-youtube-target" }, (response) => {
    if (chrome.runtime.lastError) {
      callback(info.pageUrl || directUrl);
      return;
    }

    const contentUrl = response && response.url;
    callback(parseYoutubeUrl(contentUrl, preferredKind) ? contentUrl : (info.pageUrl || directUrl));
  });
}

function openWithMpv(rawUrl, preferredKind = "auto") {
  const target = parseYoutubeUrl(rawUrl, preferredKind);
  if (!target) {
    console.log("Không tìm thấy link YouTube phù hợp để gửi sang MPV:", rawUrl, preferredKind);
    return;
  }

  chrome.runtime.sendNativeMessage(HOST_NAME, target, (response) => {
    if (chrome.runtime.lastError) {
      console.error("Lỗi kết nối Native Host:", chrome.runtime.lastError.message);
      return;
    }

    console.log("Phản hồi từ Native Host:", response);
  });
}

function createMenus() {
  chrome.contextMenus.create({
    id: VIDEO_MENU_ID,
    title: "Mở video bằng MPV",
    contexts: ["link", "page"],
    documentUrlPatterns: [
      "https://*.youtube.com/*",
      "https://youtu.be/*",
    ],
  });

  chrome.contextMenus.create({
    id: PLAYLIST_MENU_ID,
    title: "Mở playlist bằng MPV",
    contexts: ["link", "page"],
    documentUrlPatterns: [
      "https://*.youtube.com/*",
      "https://youtu.be/*",
    ],
  });
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(createMenus);
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === VIDEO_MENU_ID) {
    getTabTargetUrl(info, tab, "video", (url) => openWithMpv(url, "video"));
  } else if (info.menuItemId === PLAYLIST_MENU_ID) {
    getTabTargetUrl(info, tab, "playlist", (url) => openWithMpv(url, "playlist"));
  }
});

if (chrome.contextMenus.onShown) {
  chrome.contextMenus.onShown.addListener((info, tab) => {
    const updateVisibility = (rawUrl) => {
      chrome.contextMenus.update(VIDEO_MENU_ID, {
        visible: Boolean(parseYoutubeUrl(rawUrl, "video")),
      });
      chrome.contextMenus.update(PLAYLIST_MENU_ID, {
        visible: Boolean(parseYoutubeUrl(rawUrl, "playlist")),
      });
      chrome.contextMenus.refresh();
    };

    const rawUrl = info.linkUrl || info.pageUrl;
    if (parseYoutubeUrl(rawUrl, "video") || parseYoutubeUrl(rawUrl, "playlist") || !tab || !tab.id) {
      updateVisibility(rawUrl);
      return;
    }

    chrome.tabs.sendMessage(tab.id, { type: "get-youtube-target" }, (response) => {
      if (chrome.runtime.lastError) {
        updateVisibility(rawUrl);
        return;
      }

      updateVisibility((response && response.url) || rawUrl);
    });
  });
}

chrome.action.onClicked.addListener((tab) => {
  if (tab && tab.url) {
    openWithMpv(tab.url, "auto");
    return;
  }

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0] && tabs[0].url) openWithMpv(tabs[0].url, "auto");
  });
});
