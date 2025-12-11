let extensionPort = null;
const devtoolsPorts = [];
const POLL_INTERVAL_MS = 500;

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'FROM_PAGE') {
    const payload = message.payload;

    if (payload.type === 'FEATURE_FLAGS_LIST') {
      broadcastToPanels({
        type: 'FEATURE_FLAGS_UPDATED',
        features: payload.features || [],
      });
    }
  }

  return true;
});

chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'popup') {
    extensionPort = port;

    port.onDisconnect.addListener(() => {
      extensionPort = null;
    });

    port.onMessage.addListener((message) => {
      handlePanelMessage(message);
    });
  } else if (port.name === 'devtools-panel') {
    devtoolsPorts.push(port);

    port.onDisconnect.addListener(() => {
      const index = devtoolsPorts.indexOf(port);
      if (index > -1) {
        devtoolsPorts.splice(index, 1);
      }
    });

    port.onMessage.addListener((message) => {
      handlePanelMessage(message);
    });
  }
});

function handlePanelMessage(message) {
  if (
    message.type === 'REQUEST_FEATURES' ||
    message.type === 'REQUEST_FEATURES_FROM_TABS'
  ) {
    requestFeaturesFromTabs();
  } else if (message.type === 'RESET_AND_RELOAD') {
    sendToAllTabs({
      type: 'TO_PAGE',
      payload: {
        type: 'CLEAR_OVERRIDES_AND_RELOAD',
      },
    });
  } else if (message.type === 'TOGGLE_FEATURE') {
    sendToAllTabs({
      type: 'TO_PAGE',
      payload: {
        type: 'TOGGLE_FEATURE',
        key: message.key,
        enabled: message.enabled,
      },
    });
  }
}

function broadcastToPanels(message) {
  if (extensionPort) {
    extensionPort.postMessage(message);
  }
  devtoolsPorts.forEach((p) => {
    try {
      p.postMessage(message);
    } catch (err) {
    }
  });
}

function sendToAllTabs(message) {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      chrome.tabs.sendMessage(tab.id, message).catch((err) => {
      });
    });
  });
}

function requestFeaturesFromTabs() {
  sendToAllTabs({
    type: 'TO_PAGE',
    payload: {
      type: 'REQUEST_FEATURES',
    },
  });
}

requestFeaturesFromTabs();
setInterval(() => {
  requestFeaturesFromTabs();
}, POLL_INTERVAL_MS);
