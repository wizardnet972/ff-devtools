let featureFlags = [];
let backgroundConnection = null;
let searchQuery = '';
let filterType = 'all'; // 'all', 'enabled', 'disabled', 'overrides'

let themeMode = 'system'; // 'light', 'dark', 'system'
let systemPreferenceQuery = null;
let systemPreferenceListener = null;

function flagsEqual(a, b) {
  if (a === b) return true;
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;

  const mapA = new Map();
  const mapB = new Map();
  
  a.forEach(flag => {
    if (flag && flag.key) {
      mapA.set(flag.key, flag);
    }
  });
  
  b.forEach(flag => {
    if (flag && flag.key) {
      mapB.set(flag.key, flag);
    }
  });

  if (mapA.size !== mapB.size) return false;
  
  for (const [key, f1] of mapA) {
    const f2 = mapB.get(key);
    if (!f2) return false;

    if (
      f1.key !== f2.key ||
      f1.name !== f2.name ||
      f1.description !== f2.description ||
      f1.category !== f2.category ||
      f1.enabled !== f2.enabled ||
      f1.updatedBy !== f2.updatedBy ||
      f1.baselineEnabled !== f2.baselineEnabled
    ) {
      return false;
    }
  }

  return true;
}

function connectToBackground() {
  const backgroundPageConnection = chrome.runtime.connect({
    name: 'devtools-panel'
  });

  backgroundConnection = backgroundPageConnection;

  backgroundPageConnection.onMessage.addListener((message) => {
    if (message.type === 'FEATURE_FLAGS_UPDATED') {
      const incomingFlags = message.features || [];
      
      if (!flagsEqual(featureFlags, incomingFlags)) {
        featureFlags = incomingFlags;
        renderFeatureFlags();
      }
    }
  });

  backgroundPageConnection.postMessage({
    type: 'REQUEST_FEATURES'
  });

  backgroundPageConnection.postMessage({
    type: 'REQUEST_FEATURES_FROM_TABS'
  });

  backgroundPageConnection.onDisconnect.addListener(() => {
    backgroundConnection = null;
    setTimeout(connectToBackground, 1000);
  });
}

connectToBackground();

function initializeTheme() {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system') {
    themeMode = savedTheme;
  } else {
    themeMode = 'system';
  }

  if (window.matchMedia) {
    systemPreferenceQuery = window.matchMedia('(prefers-color-scheme: dark)');
    systemPreferenceListener = (e) => {
      if (themeMode === 'system') {
        updateTheme();
      }
    };
    systemPreferenceQuery.addEventListener('change', systemPreferenceListener);
  }

  updateTheme();
  updateThemeUI();
}

function updateTheme() {
  let isDark = false;

  if (themeMode === 'system') {
    if (systemPreferenceQuery) {
      isDark = systemPreferenceQuery.matches;
    } else if (window.matchMedia) {
      isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
  } else {
    isDark = themeMode === 'dark';
  }

  if (isDark) {
    document.body.classList.add('dark');
  } else {
    document.body.classList.remove('dark');
  }
}

function cycleTheme() {
  if (themeMode === 'system') {
    themeMode = 'light';
  } else if (themeMode === 'light') {
    themeMode = 'dark';
  } else {
    themeMode = 'system';
  }

  localStorage.setItem('theme', themeMode);
  updateTheme();
  updateThemeUI();
}

function updateThemeUI() {
  const icon = document.getElementById('theme-icon');
  const label = document.getElementById('theme-label');

  if (!icon || !label) return;

  icon.innerHTML = '';

  if (themeMode === 'system') {
    icon.innerHTML = '<path d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>';
    label.textContent = 'System';
  } else if (themeMode === 'dark') {
    icon.innerHTML = '<path d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>';
    label.textContent = 'Dark';
  } else {
    icon.innerHTML = '<path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/>';
    label.textContent = 'Light';
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initializeTheme();
    
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', cycleTheme);
    }
  });
} else {
  initializeTheme();
  
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', cycleTheme);
  }
}

function requestFeaturesFromPage() {
  if (backgroundConnection) {
    backgroundConnection.postMessage({
      type: 'REQUEST_FEATURES_FROM_TABS'
    });
  }
}

function isOverrideFlag(flag) {
  return flag.baselineEnabled !== undefined 
    ? flag.enabled !== flag.baselineEnabled 
    : flag.updatedBy === 'extension';
}

function getFilteredFlags() {
  let flags = featureFlags;
  const query = searchQuery.toLowerCase().trim();

  if (filterType === 'enabled') {
    flags = flags.filter(f => f.enabled);
  } else if (filterType === 'disabled') {
    flags = flags.filter(f => !f.enabled);
  } else if (filterType === 'overrides') {
    flags = flags.filter(f => isOverrideFlag(f));
  }

  if (query) {
    flags = flags.filter(flag => 
      flag.name.toLowerCase().includes(query) ||
      flag.key.toLowerCase().includes(query) ||
      (flag.description && flag.description.toLowerCase().includes(query)) ||
      (flag.category && flag.category.toLowerCase().includes(query))
    );
  }

  return flags;
}

function renderFeatureFlags() {
  const content = document.getElementById('content');
  const totalFlagsEl = document.getElementById('total-flags');
  const enabledFlagsEl = document.getElementById('enabled-flags');
  const overridesFlagsEl = document.getElementById('overrides-flags');
  const filterInfoEl = document.getElementById('filter-info');

  const total = featureFlags.length;
  const enabled = featureFlags.filter(f => f.enabled).length;
  const overrides = featureFlags.filter(f => isOverrideFlag(f)).length;
  totalFlagsEl.textContent = total;
  enabledFlagsEl.textContent = enabled;
  overridesFlagsEl.textContent = overrides;

  const filteredFlags = getFilteredFlags();
  const filteredCount = filteredFlags.length;

  if (searchQuery || filterType !== 'all') {
    filterInfoEl.style.display = 'block';
    filterInfoEl.textContent = `Showing ${filteredCount} of ${total} flags`;
  } else {
    filterInfoEl.style.display = 'none';
  }

  document.getElementById('total-stat').classList.toggle('active', filterType === 'all');
  document.getElementById('enabled-stat').classList.toggle('active', filterType === 'enabled');
  document.getElementById('overrides-stat').classList.toggle('active', filterType === 'overrides');

  content.innerHTML = '';

  if (filteredCount === 0) {
    const emptyMessage = searchQuery || filterType !== 'all' 
      ? 'No flags match your search or filter criteria.'
      : 'Navigate to your application to load feature flags.';
    content.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/>
        </svg>
        <h3>No feature flags found</h3>
        <p>${emptyMessage}</p>
      </div>
    `;
    return;
  }

  const grouped = {};
  filteredFlags.forEach(flag => {
    const category = flag.category || 'General';
    if (!grouped[category]) {
      grouped[category] = [];
    }
    grouped[category].push(flag);
  });

  Object.keys(grouped).sort().forEach(category => {
    const categoryDiv = document.createElement('div');
    categoryDiv.className = 'category';

    const categoryTitle = document.createElement('div');
    categoryTitle.className = 'category-title';
    categoryTitle.textContent = category;
    categoryDiv.appendChild(categoryTitle);

    grouped[category].forEach(flag => {
      const flagDiv = document.createElement('div');
      flagDiv.className = 'flag-item';

      const flagHeader = document.createElement('div');
      flagHeader.className = 'flag-header';

      const flagInfo = document.createElement('div');
      flagInfo.className = 'flag-info';

      const flagName = document.createElement('div');
      flagName.className = 'flag-name';
    const isOverride = isOverrideFlag(flag);
      
      flagName.innerHTML = `
        ${flag.name}
        <span class="status-badge ${flag.enabled ? 'enabled' : 'disabled'}">
          ${flag.enabled ? '✓ Enabled' : '✗ Disabled'}
        </span>
        ${isOverride ? '<span class="status-badge enabled" style="background: #e8f0fe; color: #1a73e8;">Override</span>' : ''}
      `;

      const flagKey = document.createElement('div');
      flagKey.className = 'flag-key';
      flagKey.textContent = flag.key;

      flagInfo.appendChild(flagName);
      flagInfo.appendChild(flagKey);

      if (flag.description) {
        const flagDesc = document.createElement('div');
        flagDesc.className = 'flag-description';
        flagDesc.textContent = flag.description;
        flagInfo.appendChild(flagDesc);
      }

      const toggleContainer = document.createElement('label');
      toggleContainer.className = 'toggle-switch';
      const toggleInput = document.createElement('input');
      toggleInput.type = 'checkbox';
      toggleInput.checked = flag.enabled;
      toggleInput.addEventListener('change', () => {
        toggleFeature(flag.key, toggleInput.checked);
      });

      const toggleSlider = document.createElement('span');
      toggleSlider.className = 'toggle-slider';

      toggleContainer.appendChild(toggleInput);
      toggleContainer.appendChild(toggleSlider);

      flagHeader.appendChild(flagInfo);
      flagHeader.appendChild(toggleContainer);
      flagDiv.appendChild(flagHeader);
      categoryDiv.appendChild(flagDiv);
    });

    content.appendChild(categoryDiv);
  });
}

function toggleFeature(key, enabled) {
  if (backgroundConnection) {
    backgroundConnection.postMessage({
      type: 'TOGGLE_FEATURE',
      key: key,
      enabled: enabled
    });
  }
}

document.getElementById('refresh-btn').addEventListener('click', () => {
  if (backgroundConnection) {
    backgroundConnection.postMessage({ type: 'RESET_AND_RELOAD' });
  }
});

document.getElementById('search-input').addEventListener('input', (e) => {
  searchQuery = e.target.value;
  renderFeatureFlags();
});

document.getElementById('total-stat').addEventListener('click', () => {
  filterType = 'all';
  renderFeatureFlags();
});

document.getElementById('enabled-stat').addEventListener('click', () => {
  filterType = 'enabled';
  renderFeatureFlags();
});

document.getElementById('overrides-stat').addEventListener('click', () => {
  filterType = 'overrides';
  renderFeatureFlags();
});

renderFeatureFlags();
