window.addEventListener('message', (event) => {
  if (event.source !== window) return;

  const message = event.data;

  if (message && message.source === 'feature-flags-app') {
    if (!chrome.runtime || !chrome.runtime.id) {
      return;
    }
    
    chrome.runtime.sendMessage({
      type: 'FROM_PAGE',
      payload: message
    }).catch(err => {
    });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'TO_PAGE') {
    window.postMessage({
      source: 'feature-flags-extension',
      ...message.payload
    }, '*');
  }
  
  return true;
});
