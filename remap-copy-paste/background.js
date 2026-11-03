chrome.commands.onCommand.addListener((command) => {
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    if (!tab?.id) return;
    
    const action = command === "remap-copy" ? "copy" : "paste";
    
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (act) => document.execCommand(act),
      args: [action]
    });
  });
});
