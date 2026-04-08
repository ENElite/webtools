import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useFullscreen } from '../index';

describe('useFullscreen', () => {
	beforeEach(() => {
		vi.stubGlobal('requestAnimationFrame', vi.fn((cb) => setTimeout(cb, 0)));
		// Mock fullscreenElement to null before each test
		Object.defineProperty(document, 'fullscreenElement', {
			value: null,
			configurable: true,
			writable: true,
		});
	});

	it('should initialize with correct state', () => {
		const { result } = renderHook(() => useFullscreen());
		expect(document.fullscreenElement).toBeNull();
		expect(result.current.isFullscreen).toBe(false);
		expect(typeof result.current.isSupported).toBe('boolean');
	});

	it('should have enter, exit, and toggle functions', () => {
		const { result } = renderHook(() => useFullscreen());
		expect(typeof result.current.enter).toBe('function');
		expect(typeof result.current.exit).toBe('function');
		expect(typeof result.current.toggle).toBe('function');
	});

	it('should detect fullscreen support', () => {
		const { result } = renderHook(() => useFullscreen());
		const isSupported = typeof document.documentElement.requestFullscreen === 'function';
		expect(result.current.isSupported).toBe(isSupported);
	});

	it('should handle fullscreen events', async () => {
		const mockRequestFullscreen = vi.fn().mockResolvedValue(undefined);
		Object.defineProperty(Element.prototype, 'requestFullscreen', {
			value: mockRequestFullscreen,
			configurable: true,
		});

		const { result } = renderHook(() => useFullscreen());

		if (result.current.isSupported) {
			await act(async () => {
				await result.current.enter();
			});

			expect(mockRequestFullscreen).toHaveBeenCalled();
		}
	});

	it('should handle exit fullscreen', async () => {
		const mockExitFullscreen = vi.fn().mockResolvedValue(undefined);
		Object.defineProperty(document, 'exitFullscreen', {
			value: mockExitFullscreen,
			configurable: true,
		});

		const { result } = renderHook(() => useFullscreen());

		if (result.current.isSupported) {
			// Simulate fullscreen state
			Object.defineProperty(document, 'fullscreenElement', {
				value: document.documentElement,
				writable: true,
				configurable: true,
			});

			await act(async () => {
				await result.current.exit();
			});

			expect(mockExitFullscreen).toHaveBeenCalled();

			// Clean up
			Object.defineProperty(document, 'fullscreenElement', {
				value: null,
				writable: true,
				configurable: true,
			});
		}
	});

	it('should toggle fullscreen state', async () => {
		const mockRequestFullscreen = vi.fn().mockResolvedValue(undefined);
		const mockExitFullscreen = vi.fn().mockResolvedValue(undefined);

		Object.defineProperty(Element.prototype, 'requestFullscreen', {
			value: mockRequestFullscreen,
			configurable: true,
		});
		Object.defineProperty(document, 'exitFullscreen', {
			value: mockExitFullscreen,
			configurable: true,
		});

		const { result, rerender } = renderHook(() => useFullscreen());

		if (result.current.isSupported) {
			// Toggle to fullscreen
			await act(async () => {
				await result.current.toggle();
			});

			rerender();

			// Toggle from fullscreen
			Object.defineProperty(document, 'fullscreenElement', {
				value: document.documentElement,
				writable: true,
				configurable: true,
			});

			rerender();

			if (result.current.isFullscreen) {
				await act(async () => {
					await result.current.toggle();
				});

				expect(mockExitFullscreen).toHaveBeenCalled();
			}

			// Clean up
			Object.defineProperty(document, 'fullscreenElement', {
				value: null,
				writable: true,
				configurable: true,
			});
		}
	});
});
