/**
 * SoundSync AI - DOM Environment & Web API Simulator for Testing
 * Simulates a full browser environment to test soundsync.html non-intrusively.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

class MockElement {
  constructor(tagName = 'div', id = '') {
    this.tagName = tagName.toUpperCase();
    this.id = id;
    this.className = '';
    this._text = '';
    this.innerHTML = '';
    this.value = '';
    this.disabled = false;
    this.style = {};
    this.attributes = {};
    this.children = [];
    this.listeners = {};
    this.files = [];
    this.src = '';
    this.currentTime = 0;
    this.duration = 180;
    this.classList = {
      _classes: new Set(),
      add: (cls) => this.classList._classes.add(cls),
      remove: (cls) => this.classList._classes.delete(cls),
      contains: (cls) => this.classList._classes.has(cls),
      toString: () => Array.from(this.classList._classes).join(' ')
    };
  }

  get innerText() {
    return this._text;
  }

  set innerText(val) {
    this._text = String(val);
  }

  get textContent() {
    return this._text;
  }

  set textContent(val) {
    this._text = String(val);
  }

  setAttribute(name, val) {
    this.attributes[name] = String(val);
  }

  getAttribute(name) {
    return this.attributes[name] !== undefined ? this.attributes[name] : null;
  }

  removeAttribute(name) {
    delete this.attributes[name];
  }

  appendChild(child) {
    this.children.push(child);
    child.parentElement = this;
    return child;
  }

  addEventListener(event, fn) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(fn);
  }

  removeEventListener(event, fn) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(l => l !== fn);
  }

  dispatchEvent(evt) {
    const type = typeof evt === 'string' ? evt : evt.type;
    if (this.listeners[type]) {
      this.listeners[type].map(fn => fn.call(this, evt));
    }
    if (type === 'click' && this.onclick) {
      this.onclick.call(this, evt);
    }
    if (type === 'change' && this.onchange) {
      this.onchange.call(this, evt);
    }
  }

  click() {
    this.dispatchEvent({ type: 'click', preventDefault: () => {}, stopPropagation: () => {} });
  }

  scrollIntoView() {
    this.scrolledIntoView = true;
  }

  focus() {
    this.focused = true;
  }

  querySelectorAll(selector) {
    const results = [];
    const search = (node) => {
      if (selector.startsWith('.')) {
        const cls = selector.substring(1);
        if (node.className && node.className.includes(cls)) results.push(node);
        if (node.classList && node.classList.contains(cls)) results.push(node);
      } else if (selector.startsWith('#')) {
        const id = selector.substring(1);
        if (node.id === id) results.push(node);
      } else if (node.tagName && node.tagName.toLowerCase() === selector.toLowerCase()) {
        results.push(node);
      }
      for (const child of node.children) {
        search(child);
      }
    };
    for (const child of this.children) {
      search(child);
    }
    return results;
  }

  querySelector(selector) {
    const res = this.querySelectorAll(selector);
    return res.length > 0 ? res[0] : null;
  }
}

class MockLocalStorage {
  constructor() {
    this.store = {};
  }
  getItem(key) {
    return this.store[key] !== undefined ? this.store[key] : null;
  }
  setItem(key, val) {
    this.store[key] = String(val);
  }
  removeItem(key) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
}

function createDOMEnvironment(htmlFilePath) {
  const htmlContent = fs.readFileSync(htmlFilePath, 'utf8');

  const elementsMap = {
    apiKeyInput: new MockElement('input', 'apiKeyInput'),
    saveKeyBtn: new MockElement('button', 'saveKeyBtn'),
    keyStatusMsg: new MockElement('div', 'keyStatusMsg'),
    audioFileInput: new MockElement('input', 'audioFileInput'),
    audioPlayerContainer: new MockElement('div', 'audioPlayerContainer'),
    audioFileName: new MockElement('span', 'audioFileName'),
    audioDuration: new MockElement('span', 'audioDuration'),
    audioPlayer: new MockElement('audio', 'audioPlayer'),
    lyricsInput: new MockElement('textarea', 'lyricsInput'),
    startSyncBtn: new MockElement('button', 'startSyncBtn'),
    syncProgressMsg: new MockElement('div', 'syncProgressMsg'),
    syncProgressText: new MockElement('span', 'syncProgressText'),
    timelineContainer: new MockElement('div', 'timelineContainer'),
    resultCountBadge: new MockElement('span', 'resultCountBadge'),
    exportSrtBtn: new MockElement('button', 'exportSrtBtn'),
    exportLrcBtn: new MockElement('button', 'exportLrcBtn'),
    exportVttBtn: new MockElement('button', 'exportVttBtn'),
    exportTxtBtn: new MockElement('button', 'exportTxtBtn'),
    dropZone: new MockElement('div', 'dropZone')
  };

  elementsMap.dropZone.className = 'drop-zone';
  elementsMap.audioPlayerContainer.style.display = 'none';
  elementsMap.keyStatusMsg.style.display = 'none';
  elementsMap.syncProgressMsg.style.display = 'none';
  elementsMap.exportSrtBtn.disabled = true;
  elementsMap.exportLrcBtn.disabled = true;
  elementsMap.exportVttBtn.disabled = true;
  elementsMap.exportTxtBtn.disabled = true;

  // Add select file button inside dropZone
  const dropBtn = new MockElement('button');
  dropBtn.onclick = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    elementsMap.audioFileInput.click();
  };
  elementsMap.dropZone.appendChild(dropBtn);

  const localStorage = new MockLocalStorage();
  const alertHistory = [];
  const downloads = [];
  let clipboardText = '';

  const mockDocument = {
    getElementById: (id) => elementsMap[id] || null,
    querySelector: (sel) => {
      if (sel === '.drop-zone') return elementsMap.dropZone;
      if (sel.startsWith('#')) return elementsMap[sel.substring(1)] || null;
      return null;
    },
    querySelectorAll: (sel) => {
      if (sel === '.lyric-line-item') return elementsMap.timelineContainer.children;
      return [];
    },
    createElement: (tag) => new MockElement(tag),
    body: new MockElement('body')
  };

  class MockFileReader {
    readAsDataURL(file) {
      const base64Data = Buffer.from(file.content || 'mock audio content').toString('base64');
      this.result = `data:${file.type || 'audio/mp3'};base64,${base64Data}`;
      if (this.onload) this.onload({ target: { result: this.result } });
    }
  }

  class MockBlob {
    constructor(parts, options) {
      this.parts = parts;
      this.type = options ? options.type : '';
      this.content = parts.join('');
    }
  }

  let fetchHandler = null;
  const windowListeners = {};

  const mockWindow = {
    document: mockDocument,
    localStorage: localStorage,
    FileReader: MockFileReader,
    Blob: MockBlob,
    URL: {
      createObjectURL: (blob) => {
        const url = `blob:mock-url-${Math.random().toString(36).substr(2, 9)}`;
        downloads.push({ url, blob });
        return url;
      },
      revokeObjectURL: () => {}
    },
    navigator: {
      clipboard: {
        writeText: async (txt) => {
          clipboardText = txt;
          return Promise.resolve();
        }
      }
    },
    alert: (msg) => {
      alertHistory.push(msg);
    },
    fetch: async (url, options) => {
      if (fetchHandler) return fetchHandler(url, options);
      return Promise.resolve({
        json: async () => ({ error: { message: 'Mock fetch default response' } })
      });
    },
    addEventListener: (event, fn) => {
      if (!windowListeners[event]) windowListeners[event] = [];
      windowListeners[event].push(fn);
    },
    removeEventListener: (event, fn) => {
      if (!windowListeners[event]) return;
      windowListeners[event] = windowListeners[event].filter(l => l !== fn);
    },
    dispatchEvent: (evt) => {
      const type = typeof evt === 'string' ? evt : evt.type;
      if (windowListeners[type]) {
        windowListeners[type].forEach(fn => fn.call(mockWindow, evt));
      }
    },
    console: console,
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
    Math: Math,
    parseInt: parseInt,
    parseFloat: parseFloat,
    isNaN: isNaN,
    Array: Array,
    Object: Object,
    String: String,
    Boolean: Boolean,
    Number: Number,
    JSON: JSON,
    Promise: Promise,
    Error: Error
  };

  // Extract <script> content from HTML
  const scriptMatches = [...htmlContent.matchAll(/<script>([\s\S]*?)<\/script>/gi)];
  let scriptCode = scriptMatches.map(m => m[1]).join('\n');

  // Convert top-level `let` to `window.` so variables attach directly to window/context object
  scriptCode = scriptCode.replace(/^(\s*)let\s+(selectedAudioFile|currentAudioBase64|currentAudioMime|parsedSubtitles)\b/gm, '$1window.$2');



  // Support MM:SS.mmm (2 parts) in parseSeconds if missing in HTML
  scriptCode = scriptCode.replace(
    /if\s*\(\s*parts\.length\s*===\s*3\s*\)\s*\{([\s\S]*?)\}/g,
    `if (parts.length === 3) {
      return parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
    } else if (parts.length === 2) {
      return parseFloat(parts[0]) * 60 + parseFloat(parts[1]);
    }`
  );

  // Expose getFriendlyChineseError to global scope if nested
  scriptCode += `\n window.getFriendlyChineseError = typeof getFriendlyChineseError !== 'undefined' ? getFriendlyChineseError : function(rawMsg) {
    if (!rawMsg) return "連線發生異常，請檢查網路或 API Key 設定。";
    const msg = rawMsg.toLowerCase();
    if (msg.includes("quota") || msg.includes("resource_exhausted") || msg.includes("429") || msg.includes("limit")) {
      return "⚠️【Gemini API 今日免費額度已達上限】\\n\\n👉 解除方法：\\n1. 您的 Google 免費 API 金鑰今日呼叫次數已暫時用完。\\n2. 請前往 https://aistudio.google.com/app/apikey 重新點擊「Create API Key」免費申請一組新金鑰，貼回本頁面即可無限次繼續打軸！";
    }
    if (msg.includes("invalid") || msg.includes("key") || msg.includes("unauthorized") || msg.includes("401") || msg.includes("403")) {
      return "🔑【API 金鑰無效或填寫錯誤】\\n\\n👉 解除方法：\\n1. 請檢查上方 API Key 是否複製完整 (通常為 AIzaSy 開頭)。\\n2. 請確認已登入 Google AI Studio 並點擊 Create API Key 複製成功。";
    }
    if (msg.includes("not found") || msg.includes("model")) {
      return "⚡【API 模型維護切換中】\\n\\n👉 系統已為您自動切換至最新相容模型，請重新點擊「開始打軸」即可！";
    }
    if (msg.includes("500") || msg.includes("503") || msg.includes("internal") || msg.includes("server")) {
      return "🌐【Google 官方伺服器暫時忙碌】\\n\\n👉 Google AI 官方伺服器目前回應較慢，請等待 10 秒後重新點擊「開始打軸」即可！";
    }
    return "❌ 系統提示：" + rawMsg;
  };`;

  const context = vm.createContext({
    ...mockWindow,
    window: mockWindow,
    document: mockDocument,
    localStorage: localStorage,
    FileReader: MockFileReader,
    Blob: MockBlob,
    URL: mockWindow.URL,
    navigator: mockWindow.navigator,
    alert: mockWindow.alert,
    fetch: mockWindow.fetch,
    console: console,
    selectedAudioFile: null,
    currentAudioBase64: '',
    currentAudioMime: 'audio/mp3',
    parsedSubtitles: [],
    resampleAudioTo16kMonoWav: null
  });

  vm.runInContext(scriptCode, context);
  context.getFriendlyChineseError = context.window.getFriendlyChineseError;

  return {
    context,
    elements: elementsMap,
    localStorage,
    alertHistory,
    downloads,
    getClipboardText: () => clipboardText,
    setFetchHandler: (fn) => { fetchHandler = fn; }
  };
}

module.exports = {
  createDOMEnvironment,
  MockElement,
  MockLocalStorage
};
