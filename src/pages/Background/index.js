console.log('load bg script');

function openAlly() {
  // Inject Ally on install
  const manifest = chrome.runtime.getManifest();

  const injectIntoTab = (tab) => {
    const scripts = manifest.content_scripts[0].js;

    for (let i = 0; i < scripts.length; i++) {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: [scripts[i]],
      });
    }

    chrome.scripting.insertCSS({
      target: { tabId: tab.id },
      files: manifest.content_scripts[0].css,
    });
  };

  // Get all windows
  chrome.windows.getAll(
    {
      populate: true,
    },
    (windows) => {
      let currentWindow;
      const w = windows.length;

      for (let i = 0; i < w; i++) {
        currentWindow = windows[i];

        let currentTab;
        const t = currentWindow.tabs.length;

        for (let j = 0; j < t; j++) {
          currentTab = currentWindow.tabs[j];
          if (
            !currentTab.url.includes('chrome://') &&
            !currentTab.url.includes('chrome-extension://') &&
            !currentTab.url.includes('chrome.google.com')
          ) {
            injectIntoTab(currentTab);
          }
        }
      }
    }
  );
}

// Listen for the open ally shortcut
chrome.commands.onCommand.addListener((command) => {
  switch (command) {
    case 'open-ally':
      console.log('open-ally');
      // openAlly();
      break;

    default:
      break;
  }
});
