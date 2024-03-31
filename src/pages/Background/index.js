console.log('load bg script');

const getActiveTab = async () => {
  const [activeTab] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });
  return activeTab;
};

const openAlly = () => {
  getActiveTab().then((response) => {
    chrome.tabs.sendMessage(response.id, { request: 'open-ally' });
  });
};

const closeAlly = () => {
  getActiveTab().then((response) => {
    chrome.tabs.sendMessage(response.id, { request: 'close-ally' });
  });
};

const attachDebugger = (tabId) => {
  return new Promise((resolve, reject) => {
    try {
      chrome.debugger.attach({ tabId }, '1.2', async () => {
        if (chrome.runtime.lastError) {
          console.error(
            'Failed to attach debugger:',
            chrome.runtime.lastError.message
          );
          reject(
            new Error(
              `Failed to attach debugger: ${chrome.runtime.lastError.message}`
            )
          );
        } else {
          console.log('attached to debugger');
          await chrome.debugger.sendCommand({ tabId }, 'DOM.enable');
          console.log('DOM enabled');
          await chrome.debugger.sendCommand({ tabId }, 'Runtime.enable');
          console.log('Runtime enabled');
          resolve();
        }
      });
    } catch (e) {
      reject(e);
    }
  });
};

const detachDebugger = async (tabId) => {
  const targets = await chrome.debugger.getTargets();
  const isAttached = targets.some(
    (target) => target.tabId === tabId && target.attached
  );
  if (isAttached) {
    chrome.debugger.detach({ tabId: tabId });
  }
};

// These are extensions that are known to interfere with the operation of Taxy.
// We'll turn them off temporarily while Taxy is performing actions.
const incompatibleExtensions = [
  // Dashlane
  'fdjamakpfbbddfjaooikfcpapjohcfmg',
  // LastPass
  'hdokiejnpimakedhajhdlcegeplioahd',
];

const disableCounts = {};

export const disableIncompatibleExtensions = async () => {
  const enabledBlacklistedExtensions = await new Promise((resolve, reject) => {
    chrome.management.getAll((extensions) => {
      if (chrome.runtime.lastError) {
        console.error(
          'Failed to get extensions:',
          chrome.runtime.lastError.message
        );
        reject(chrome.runtime.lastError);
      } else {
        resolve(
          extensions.filter(
            (extension) =>
              extension.type === 'extension' &&
              extension.enabled &&
              incompatibleExtensions.includes(extension.id)
          )
        );
      }
    });
  });

  for (const extension of enabledBlacklistedExtensions) {
    chrome.management.setEnabled(extension.id, false, () => {
      if (chrome.runtime.lastError) {
        console.error(
          `Failed to disable extension ${extension.id}:`,
          chrome.runtime.lastError.message
        );
      }
      disableCounts[extension.id] = (disableCounts[extension.id] || 0) + 1;
    });
  }
};

export const reenableExtensions = async () => {
  const disabledBlacklistedExtensions = await new Promise((resolve, reject) => {
    chrome.management.getAll((extensions) => {
      if (chrome.runtime.lastError) {
        console.error(
          'Failed to get extensions:',
          chrome.runtime.lastError.message
        );
        reject(chrome.runtime.lastError);
      } else {
        resolve(
          extensions.filter(
            (extension) =>
              extension.type === 'extension' &&
              !extension.enabled &&
              incompatibleExtensions.includes(extension.id)
          )
        );
      }
    });
  });

  for (const extension of disabledBlacklistedExtensions) {
    if (disableCounts[extension.id] > 1) {
      // If we have multiple sessions running and have disabled the extension
      // multiple times, we only want to re-enable it once all sessions have
      // finished.
      disableCounts[extension.id] = disableCounts[extension.id] - 1;
    } else if (disableCounts[extension.id] === 1) {
      await new Promise((resolve, reject) => {
        chrome.management.setEnabled(extension.id, true, () => {
          if (chrome.runtime.lastError) {
            console.error(
              `Failed to enable extension ${extension.id}:`,
              chrome.runtime.lastError.message
            );
            reject(chrome.runtime.lastError);
          }
          delete disableCounts[extension.id];
          resolve(0);
        });
      });
    }
  }
};

const commandDebugger = ({ tabId, method, params }) => {
  return chrome.debugger.sendCommand({ tabId }, method, params);
};

chrome.commands.onCommand.addListener((command) => {
  console.log('Command:', command);

  switch (command) {
    case 'open-ally':
      console.log('bg open-ally');
      openAlly();
      break;

    default:
      break;
  }
});

// Receive messages from any tab
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Message:', message);

  switch (message.request) {
    case 'close-ally': {
      console.log('bg close-ally');
      closeAlly();
      break;
    }

    case 'get-active-tab': {
      getActiveTab().then((activeTab) => {
        console.log('bg get-active-tab result: ', activeTab);
        sendResponse(activeTab);
      });
      break;
    }

    case 'attach-debugger': {
      console.log('bg attach-debugger');
      attachDebugger(message.options.tabId).then(sendResponse);
      break;
    }

    case 'detach-debugger': {
      console.log('bg detach-debugger');
      detachDebugger(message.options.tabId).then(sendResponse);
      break;
    }

    case 'disable-incompatible-extensions': {
      console.log('bg disable-incompatible-extensions');
      disableIncompatibleExtensions().then(sendResponse);
      break;
    }

    case 'reenable-extensions': {
      console.log('bg reenable-extensions');
      reenableExtensions().then(sendResponse);
      break;
    }

    case 'command-debugger': {
      console.log('bg command-debugger');
      commandDebugger(message.options).then(sendResponse);
      break;
    }

    default:
      break;
  }

  return true;
});

// Check when the extension button is clicked
chrome.action.onClicked.addListener((tab) => {
  console.log('click');
  chrome.tabs.sendMessage(tab.id, { request: 'open-ally' });
});
