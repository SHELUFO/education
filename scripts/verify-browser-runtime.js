const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const publicDir = path.join(root, "public");

function read(file) {
  return fs.readFileSync(path.join(publicDir, file), "utf8");
}

function createElement(id) {
  return {
    id,
    innerHTML: "",
    textContent: "",
    style: {},
    getBoundingClientRect() {
      return { left: 0, top: 0, width: 800, height: 600 };
    },
    scrollLeft: 0,
    scrollTop: 0
  };
}

const elements = {};
const context = {
  console,
  localStorage: {
    store: {},
    getItem(key) { return this.store[key] || null; },
    setItem(key, value) { this.store[key] = String(value); },
    removeItem(key) { delete this.store[key]; }
  },
  document: {
    getElementById(id) {
      if (!elements[id]) elements[id] = createElement(id);
      return elements[id];
    },
    createElement() {
      return { click() {}, style: {} };
    }
  },
  window: {
    print() {}
  },
  Blob: function Blob(parts, options) {
    return { parts, options };
  },
  URL: {
    createObjectURL() { return "blob:test"; },
    revokeObjectURL() {}
  },
  alert(message) {
    throw new Error(`Unexpected alert: ${message}`);
  },
  confirm() {
    return true;
  }
};

vm.createContext(context);
[
  "preview-data.js",
  "js/core.js",
  "js/network.js",
  "js/learn.js",
  "js/quiz.js",
  "js/paper.js",
  "js/practice.js",
  "js/daily.js",
  "js/library.js",
  "js/app.js"
].forEach((file) => {
  vm.runInContext(read(file), context, { filename: file });
});

vm.runInContext("startDailyPractice();", context);
const html = elements.app.innerHTML;
if (!html.includes("每日练") || !html.includes("阶段报告")) {
  throw new Error("Daily practice runtime render failed");
}

vm.runInContext("state.view='network'; state.networkMode='overview'; render();", context);
const networkHtml = elements.app.innerHTML;
if (!networkHtml.includes("network-svg") || !networkHtml.includes("学习路径目标")) {
  throw new Error("Vector network runtime render failed");
}

console.log("Browser runtime verification passed.");
