console.log('load bg script');

const getCurrentTab = async () => {
  const queryOptions = { active: true, currentWindow: true };
  const [tab] = await chrome.tabs.query(queryOptions);
  return tab;
};

const openAlly = () => {
  getCurrentTab().then((response) => {
    chrome.tabs.sendMessage(response.id, { request: 'open-ally' });
  });
};

const closeAlly = () => {
  getCurrentTab().then((response) => {
    chrome.tabs.sendMessage(response.id, { request: 'close-ally' });
  });
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
chrome.runtime.onMessage.addListener((message) => {
  console.log('Message:', message);

  switch (message.request) {
    case 'close-ally':
      console.log('bg close-ally');
      closeAlly();
      break;

    default:
      break;
  }
});

// Check when the extension button is clicked
chrome.action.onClicked.addListener((tab) => {
  console.log('click');
  chrome.tabs.sendMessage(tab.id, { request: 'open-ally' });
});
