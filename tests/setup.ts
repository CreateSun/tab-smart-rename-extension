import { vi } from "vitest";
Object.assign(globalThis, { chrome: { runtime: { onMessage: { addListener: vi.fn() }, sendMessage: vi.fn() } } });
