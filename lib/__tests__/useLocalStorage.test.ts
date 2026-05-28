// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useLocalStorage } from "../useLocalStorage";

beforeEach(() => localStorage.clear());
afterEach(() => localStorage.clear());

describe("useLocalStorage", () => {
  it("returns defaultValue when nothing is stored", () => {
    const { result } = renderHook(() => useLocalStorage("key", "default"));
    expect(result.current[0]).toBe("default");
  });

  it("returns stored value when key exists", () => {
    localStorage.setItem("key", JSON.stringify("stored"));
    const { result } = renderHook(() => useLocalStorage("key", "default"));
    expect(result.current[0]).toBe("stored");
  });

  it("persists value to localStorage on update", () => {
    const { result } = renderHook(() => useLocalStorage("key", "default"));
    act(() => result.current[1]("updated"));
    expect(localStorage.getItem("key")).toBe(JSON.stringify("updated"));
    expect(result.current[0]).toBe("updated");
  });

  it("works with arrays", () => {
    const { result } = renderHook(() => useLocalStorage<string[]>("arr", []));
    act(() => result.current[1](["a", "b"]));
    expect(result.current[0]).toEqual(["a", "b"]);
    expect(JSON.parse(localStorage.getItem("arr")!)).toEqual(["a", "b"]);
  });

  it("works with objects", () => {
    const { result } = renderHook(() =>
      useLocalStorage<{ x: number }>("obj", { x: 0 })
    );
    act(() => result.current[1]({ x: 42 }));
    expect(result.current[0]).toEqual({ x: 42 });
    expect(JSON.parse(localStorage.getItem("obj")!)).toEqual({ x: 42 });
  });

  it("returns defaultValue and does not throw when stored JSON is corrupt", () => {
    localStorage.setItem("key", "not-json{{");
    const { result } = renderHook(() => useLocalStorage("key", "fallback"));
    expect(result.current[0]).toBe("fallback");
  });

  it("persists null correctly", () => {
    const { result } = renderHook(() =>
      useLocalStorage<string | null>("key", "default")
    );
    act(() => result.current[1](null));
    expect(result.current[0]).toBeNull();
    expect(JSON.parse(localStorage.getItem("key")!)).toBeNull();
  });
});
