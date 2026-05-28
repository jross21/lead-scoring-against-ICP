import { TextEncoder, TextDecoder } from "util";

// Mock localStorage for jsdom
if (typeof global.localStorage === "undefined") {
  let store: Record<string, string> = {};

  global.localStorage = {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
    length: Object.keys(store).length,
  } as Storage;
}

// Polyfill for TextEncoder/TextDecoder
if (typeof global.TextEncoder === "undefined") {
  Object.assign(global, { TextEncoder, TextDecoder });
}
