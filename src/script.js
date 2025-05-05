const defaultSettings = {
  weather: {
    apiKey: '',
  },
  appearance: {
    time: 'meaji',
    quote: 'Intueor in praesentia. Intueri, ergo intus.'
  },
}

let settings = defaultSettings;

if (typeof browser !== 'undefined') {
  browser.storage.local.get('settings').then(data => {
    if (data.settings) {
      settings = data.settings;
      applySettings();
      console.log("[INFO] Settings retrieved.")
    } else {
      browser.storage.local.set({ settings: defaultSettings });
    }
  })
} else {
  chrome.storage.local.get('settings', function(data) {
    if (data.settings) {
      settings = data.settings;
      applySettings();
      console.log("[INFO] Settings retrieved.")
    } else {
      chrome.storage.local.set({ settings: defaultSettings });
    }
  });
}

function applySettings() {  
  updateTime();
  updateQuote();
  
  if (settings.appearance.showWeather) {
    fetchWeather();
  }
}

class MeajiTime {
  SECONDS_PER_MINUTE = 24
  MINUTES_PER_SUBHOUR = 24
  SUBHOUR_PER_HOUR = 9
  HOURS_PER_DAY = 32
  
  SECONDS_PER_SUBHOUR = this.SECONDS_PER_MINUTE * this.MINUTES_PER_SUBHOUR
  SECONDS_PER_HOUR = this.SECONDS_PER_SUBHOUR * this.SUBHOUR_PER_HOUR
  SECONDS_PER_DAY = this.SECONDS_PER_HOUR * this.HOURS_PER_DAY

  DAYS_PER_REGULAR_YEAR = 190
  DAYS_PER_FULL_YEAR_CYCLE = this.DAYS_PER_REGULAR_YEAR * 4 + 1

  REGULAR_MONTH_CYCLE = [21, 21, 21, 21, 21, 21, 21, 21, 22]
  LEAP_MONTH_CYCLE = [21, 21, 21, 22, 21, 21, 21, 21, 22]

  ELAPSED_SECONDS_AT_EPOCH = 101174242752
  
  QUARTERS = ['Furerka', 'Senaka', 'Myurka', 'Joteka']

  MONTHS = ['Utotes', 'Roates', "Fe'ryutes", 'Oniketes', 'Dokutes', 'Ifates', 'Asates', 'Ximutes', 'Norutes']

  constructor() {}

  durationToSeconds(days=0, hours=0, subHours=0, minutes=0, seconds=0) {
    return (
      days * this.SECONDS_PER_DAY +
      hours * this.SECONDS_PER_HOUR +
      subHours * this.SECONDS_PER_SUBHOUR +
      minutes * this.SECONDS_PER_MINUTE +
      seconds
    );
  }

  secondsToDuration(seconds) {
    let result = { days: 0, hours: 0, subHours: 0, minutes: 0, seconds: 0};
    let rem = 0;
    [result.days, rem] = divmod(seconds, this.SECONDS_PER_DAY);
    [result.hours, rem] = divmod(rem, this.SECONDS_PER_HOUR);
    [result.subHours, rem] = divmod(rem, this.SECONDS_PER_SUBHOUR);
    [result.minutes, result.seconds] = divmod(rem, this.SECONDS_PER_MINUTE);
    return Object.values(result);
  }

  isLeapYear(year) {
    return (year === 0) || (year % 4 === 0 && year % 60 !== 0);
  }

  monthCycle(year) {
    return this.isLeapYear(year) ? this.LEAP_MONTH_CYCLE : this.REGULAR_MONTH_CYCLE;
  }

  countCycle(cycle, target, valuePerUnit) {
    let value = 0;
    let elapsed = 0;

    for (let idx = 0; idx < cycle.length; idx++) {
      let item = cycle[idx];
      elapsed += item * valuePerUnit;
      if (elapsed >= target) {
        value = idx + 1;
        break;
      }
    }
    return value;
  }

  daysUpToMonth(month, year) {
    const currentMonthCycle = this.monthCycle(year);
    return currentMonthCycle.slice(0, month - 1).reduce((a, b) => a + b, 0);
  }

  toQuaterFormat(absoluteHour) {
    const quarter = this.QUARTERS[Math.floor(absoluteHour / 8)];
    const relativeHour = absoluteHour % 8;
    return [quarter, relativeHour]
  }

  getMonthName(month) {
    return this.MONTHS[month - 1];
  }

  fromTimestamp(elapsedSeconds) {
    elapsedSeconds += this.ELAPSED_SECONDS_AT_EPOCH;

    let [fullYearCycles, remainingSeconds] = divmod(elapsedSeconds, this.durationToSeconds(this.DAYS_PER_FULL_YEAR_CYCLE));
    remainingSeconds -= this.durationToSeconds(this.DAYS_PER_REGULAR_YEAR + 1);

    const extraDays = Math.floor((fullYearCycles * 4) / 60);
    remainingSeconds += this.durationToSeconds(extraDays);

    let remainingYears;
    [remainingYears, remainingSeconds] = divmod(remainingSeconds, this.durationToSeconds(this.DAYS_PER_REGULAR_YEAR));

    const year = fullYearCycles * 4 + remainingYears;

    const currentMonthCycle = this.monthCycle(year);
    const month = this.countCycle(currentMonthCycle, remainingSeconds, this.SECONDS_PER_DAY);
    remainingSeconds -= this.durationToSeconds(this.daysUpToMonth(month));

    let [day, hour, subHour, minute, second] = this.secondsToDuration(remainingSeconds);
    day += 1;

    return { year: year, month: month, day: day, hour: hour, subHour: subHour, minute: minute, second: second };
  }
}

function divmod(x, y) {
  const quotient = Math.floor(x / y);
  const remainder = x % y;
  return [quotient, remainder];
}

function updateTime() {
  const now = new Date();
  const timestamp = Math.round(Date.now() / 1000);
  const meaji = new MeajiTime();
  const timeEl = document.getElementById('time');
  const dateEl = document.getElementById('date');

  if (settings.appearance.time === 'unix') {
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    timeEl.textContent = `${hours}:${minutes}`;

    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    dateEl.textContent = now.toLocaleDateString(undefined, options);
  } else if (settings.appearance.time === 'meaji') {
    const dateObj = meaji.fromTimestamp(timestamp);
    const [quarter, hour] = meaji.toQuaterFormat(dateObj.hour);
    
    timeEl.textContent = `${dateObj.hour.toString()}.${dateObj.subHour.toString()}..${dateObj.minute.toString().padStart(2, '0')}`;

    dateEl.textContent = `${meaji.getMonthName(dateObj.month)} ${dateObj.day.toString()}, ${dateObj.year.toString()}`;
  }
}

function updateQuote() {
  const quoteEl = document.getElementById('quote');

  quoteEl.textContent = settings.appearance.quote;
}

async function fetchWeather() {
  try {
    const weatherConfig = settings.weather;
    const apiKey = weatherConfig.apiKey;
    if (!apiKey) {
      throw new Error('API key not set');
    }

    let lat = 35.1650;
    let lon = 139.1304;

    if (navigator.geolocation) {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 10000
        });
      });

      lat = position.coords.latitude;
      lon = position.coords.longitude;
    }

    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`
    );

    if (!response.ok) throw new Error('Weather API request failed');

    const data = await response.json();

    const weatherIcons = {
      '01': '☀️',
      '02': '⛅',
      '03': '☁️',
      '04': '☁️',
      '09': '🌧️',
      '10': '🌦️',
      '11': '⛈️',
      '13': '❄️',
      '50': '🌫️'
    };

    const iconCode = data.weather[0].icon.substring(0, 2);
    const icon = weatherIcons[iconCode] || '☀️';

    document.getElementById('weather-temp').textContent = `${Math.round(data.main.temp)}°C`;
    document.getElementById('weather-desc').textContent = data.weather[0].main;
    document.getElementById('weather-icon').textContent = icon;
  } catch (error) {
    console.error('Error fetching weather:', error);
  }
}

function toggleTimeType() {
  settings.appearance.time = settings.appearance.time === 'unix' ? 'meaji' : 'unix';
  updateTime();
}

updateTime();
setInterval(updateTime, 5000)

fetchWeather();

document.getElementById('time').addEventListener('click', (e) => {
  e.preventDefault();
  if (e.button === 0) {
    toggleTimeType();
  }
})

document.getElementById('settings-button').addEventListener('click', (e) => {
  if (e.button !== 0) return;
  if (chrome.runtime.openOptionsPage) {
    chrome.runtime.openOptionsPage();
  } else if (chrome.runtime) {
    window.open(chrome.runtime.getURL('options.html'));
  } else {
    location.href = 'options.html';
  }
});