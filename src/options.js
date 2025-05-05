const defaultSettings = {
  weather: {
    apiKey: '',
  },
  appearance: {
    time: 'meaji',
    quote: 'Intueor in praesentia. Intueri, ergo intus.'
  },
}

function loadSettings() {
  let settings = defaultSettings;

  if (typeof browser !== 'undefined') {
    browser.storage.local.get('settings').then(data => {
      settings = data.settings || defaultSettings
    })
  } else {
    chrome.storage.sync.get('settings', function(data) {
      settings = data.settings || defaultSettings;
    });
  }

  document.getElementById('api-key').value = settings.weather.apiKey || '';
  document.getElementById('time').value = settings.appearance.time || 'unix';
  document.getElementById('quote').value = settings.appearance.quote || 'Lorem ipsum';
}

function saveSettings() {
  const weatherSettings = {
    apiKey: document.getElementById('api-key').value,
  };

  const appearanceSettings = {
    time: document.getElementById('time').value,
    quote: document.getElementById('quote').value
  };

  const settings = {
    weather: weatherSettings,
    appearance: appearanceSettings
  }

  if (typeof browser !== 'undefined') {
    browser.storage.local.set({ settings });
  } else {
    chrome.storage.sync.set({ settings });
  }

  const saveStatus = document.getElementById('save-status');
  saveStatus.classList.add('visible');
  
  setTimeout(() => {
    saveStatus.classList.remove('visible');
  }, 2000);
}

document.addEventListener('DOMContentLoaded', loadSettings);
document.getElementById('save-button').addEventListener('click', saveSettings);