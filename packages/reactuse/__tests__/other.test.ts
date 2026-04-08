import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useTimestamp, useDocumentVisibility, useDisplayMedia, useWakeLock } from '../index';

describe('useTimestamp', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('should initialize with current timestamp', () => {
		const { result } = renderHook(() => useTimestamp({ immediate: false }));
		const now = Date.now();
		expect(result.current.timestamp).toBeLessThanOrEqual(now);
		expect(result.current.timestamp).toBeGreaterThan(now - 100);
	});

	it('should initialize with offset', () => {
		const offset = 5000;
		const { result } = renderHook(() => useTimestamp({ offset, immediate: false }));
		const now = Date.now();
		expect(result.current.timestamp).toBeLessThanOrEqual(now + offset);
		expect(result.current.timestamp).toBeGreaterThan(now + offset - 100);
	});

	it('should update timestamp over time', () => {
		const { result } = renderHook(() => useTimestamp({ interval: 100, immediate: true }));
		const initialTimestamp = result.current.timestamp;

		act(() => {
			vi.advanceTimersByTime(100);
		});

		expect(result.current.timestamp).toBeGreaterThan(initialTimestamp);
	});

	it('should pause and resume timestamp updates', () => {
		const { result } = renderHook(() => useTimestamp({ interval: 100, immediate: true }));
		const initialTimestamp = result.current.timestamp;

		act(() => {
			result.current.pause();
		});

		expect(result.current.isActive).toBe(false);

		act(() => {
			vi.advanceTimersByTime(100);
		});

		const pausedTimestamp = result.current.timestamp;

		act(() => {
			result.current.resume();
		});

		expect(result.current.isActive).toBe(true);

		act(() => {
			vi.advanceTimersByTime(100);
		});

		expect(result.current.timestamp).toBeGreaterThan(pausedTimestamp);
	});
});

describe('useDocumentVisibility', () => {
	it('should initialize with current visibility state', () => {
		const { result } = renderHook(() => useDocumentVisibility());
		expect(['visible', 'hidden', 'prerender']).toContain(result.current);
	});

	it('should update when visibility changes', () => {
		const { result } = renderHook(() => useDocumentVisibility());

		act(() => {
			Object.defineProperty(document, 'visibilityState', {
				value: 'hidden',
				writable: true,
				configurable: true,
			});

			const event = new Event('visibilitychange');
			document.dispatchEvent(event);
		});

		expect(result.current).toBe('hidden');

		act(() => {
			Object.defineProperty(document, 'visibilityState', {
				value: 'visible',
				writable: true,
				configurable: true,
			});

			const event = new Event('visibilitychange');
			document.dispatchEvent(event);
		});

		expect(result.current).toBe('visible');
	});
});

describe('useDisplayMedia', () => {
	it('should initialize with correct state', () => {
		const { result } = renderHook(() => useDisplayMedia());
		expect(result.current.isActive).toBe(false);
		expect(result.current.stream).toBeNull();
		expect(result.current.error).toBeNull();
		expect(typeof result.current.start).toBe('function');
		expect(typeof result.current.stop).toBe('function');
	});

	it('should detect display media support', () => {
		const { result } = renderHook(() => useDisplayMedia());
		const isSupported = typeof navigator.mediaDevices?.getDisplayMedia === 'function';
		expect(result.current.isSupported).toBe(isSupported);
	});

	it('should handle unsupported environment', async () => {
		const { result } = renderHook(() => useDisplayMedia());

		if (!result.current.isSupported) {
			const startResult = await act(async () => {
				return result.current.start();
			});

			expect(startResult).toBeNull();
			expect(result.current.error).not.toBeNull();
		}
	});
});

describe('useWakeLock', () => {
	it('should initialize with correct state', () => {
		const { result } = renderHook(() => useWakeLock());
		expect(result.current.isActive).toBe(false);
		expect(result.current.error).toBeNull();
		expect(typeof result.current.request).toBe('function');
		expect(typeof result.current.release).toBe('function');
	});

	it('should detect wake lock support', () => {
		const { result } = renderHook(() => useWakeLock());
		const isSupported = typeof (navigator as any).wakeLock?.request === 'function';
		expect(result.current.isSupported).toBe(isSupported);
	});

	it('should handle unsupported environment', async () => {
		const { result } = renderHook(() => useWakeLock());

		if (!result.current.isSupported) {
			const requestResult = await act(async () => {
				return result.current.request();
			});

			expect(requestResult).toBe(false);
			expect(result.current.error).not.toBeNull();
		}
	});

	it('should handle visibility change', () => {
		const { result } = renderHook(() => useWakeLock());

		act(() => {
			Object.defineProperty(document, 'visibilityState', {
				value: 'hidden',
				writable: true,
				configurable: true,
			});

			const event = new Event('visibilitychange');
			document.dispatchEvent(event);
		});

		expect(result.current.isActive).toBe(false);

		// Clean up
		Object.defineProperty(document, 'visibilityState', {
			value: 'visible',
			writable: true,
			configurable: true,
		});
	});
});
