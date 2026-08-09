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
    this.innerText = '';
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

  // Convert top-level `let` to `var` so variables attach to context object
  scriptCode = scriptCode.replace(/^(\s*)let\s+(selectedAudioFile|currentAudioBase64|currentAudioMime|parsedSubtitles)\b/gm, '$1var $2');

  // Sanitize raw unescaped newlines inside double-quoted strings in script code
  scriptCode = scriptCode.replace(/"([^"\\]*(?:\\.[^"\\]*)*)"/gs, (match) => {
    return match.replace(/\r?\n/g, '\\n');
  });

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
    parsedSubtitles: []
  });

  vm.runInContext(scriptCode, context);

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
