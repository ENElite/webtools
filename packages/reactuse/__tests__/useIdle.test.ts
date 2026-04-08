import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useIdle } from '../index';

describe('useIdle', () => {
	const originalIdleDetector = (window as Window & { IdleDetector?: unknown }).IdleDetector;
	const originalPermissions = navigator.permissions;

	beforeEach(() => {
		vi.useFakeTimers();
		Object.defineProperty(window, 'IdleDetector', {
			value: undefined,
			writable: true,
			configurable: true,
		});
		Object.defineProperty(navigator, 'permissions', {
			value: originalPermissions,
			writable: true,
			configurable: true,
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.useRealTimers();
		Object.defineProperty(window, 'IdleDetector', {
			value: originalIdleDetector,
			writable: true,
			configurable: true,
		});
		Object.defineProperty(navigator, 'permissions', {
			value: originalPermissions,
			writable: true,
			configurable: true,
		});
	});

	it('should initialize with default values', () => {
		const { result } = renderHook(() => useIdle());
		expect(result.current.idle).toBe(false);
		expect(typeof result.current.lastActive).toBe('number');
	});

	it('should initialize with initialState', () => {
		const { result } = renderHook(() => useIdle(5000, { initialState: true }));
		expect(result.current.idle).toBe(true);
	});

	it('should transition to idle after timeout', () => {
		const { result } = renderHook(() => useIdle(5000));
		expect(result.current.idle).toBe(false);

		act(() => {
			vi.advanceTimersByTime(5000);
		});

		expect(result.current.idle).toBe(true);
	});

	it('should reset idle state on activity', () => {
		const { result } = renderHook(() => useIdle(5000));

		act(() => {
			vi.advanceTimersByTime(5000);
		});

		expect(result.current.idle).toBe(true);

		act(() => {
			const event = new MouseEvent('mousemove', { bubbles: true });
			window.dispatchEvent(event);
		});

		expect(result.current.idle).toBe(false);
	});

	it('should reset idle state when reset is called', () => {
		const { result } = renderHook(() => useIdle(5000));

		act(() => {
			vi.advanceTimersByTime(5000);
		});

		expect(result.current.idle).toBe(true);

		const oldLastActive = result.current.lastActive;

		act(() => {
			result.current.reset();
		});

		expect(result.current.idle).toBe(false);
		expect(result.current.lastActive).toBeGreaterThan(oldLastActive);
	});

	it('should listen to configured events', () => {
		const { result } = renderHook(() => useIdle(5000, { events: ['keydown', 'click'] }));

		act(() => {
			vi.advanceTimersByTime(3000);
		});

		expect(result.current.idle).toBe(false);

		act(() => {
			const event = new MouseEvent('click', { bubbles: true });
			window.dispatchEvent(event);
		});

		expect(result.current.idle).toBe(false);

		act(() => {
			vi.advanceTimersByTime(5000);
		});

		expect(result.current.idle).toBe(true);
	});

	it('should handle immediate visibility change to visible', () => {
		const { result } = renderHook(() => useIdle(5000, { listenForVisibilityChange: true }));

		act(() => {
			vi.advanceTimersByTime(5000);
		});

		expect(result.current.idle).toBe(true);

		act(() => {
			Object.defineProperty(document, 'visibilityState', {
				value: 'visible',
				writable: true,
			});

			const event = new Event('visibilitychange');
			document.dispatchEvent(event);
		});

		expect(result.current.idle).toBe(false);
	});

	it('should handle zero or negative timeout', () => {
		const { result } = renderHook(() => useIdle(0));
		expect(result.current.idle).toBe(true);
	});

	it('should clean up timers on unmount', () => {
		const clearTimeoutSpy = vi.spyOn(window, 'clearTimeout');
		const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

		const { unmount } = renderHook(() => useIdle(5000));

		unmount();

		expect(clearTimeoutSpy).toHaveBeenCalled();
		expect(removeEventListenerSpy.mock.calls.length).toBeGreaterThan(0);

		clearTimeoutSpy.mockRestore();
		removeEventListenerSpy.mockRestore();
	});

	it('should prefer Idle Detection API when permission is granted', async () => {
		class MockIdleDetector extends EventTarget {
			public userState: 'active' | 'idle' = 'active';
			public screenState: 'locked' | 'unlocked' = 'unlocked';

			public async start(): Promise<void> {
				return;
			}

			public emitChange(next: { userState: 'active' | 'idle'; screenState: 'locked' | 'unlocked' }): void {
				this.userState = next.userState;
				this.screenState = next.screenState;
				this.dispatchEvent(new Event('change'));
			}
		}

		let detectorInstance: MockIdleDetector | null = null;

		Object.defineProperty(window, 'IdleDetector', {
			value: class {
				public readonly instance = new MockIdleDetector();

				public get userState(): 'active' | 'idle' {
					return this.instance.userState;
				}

				public get screenState(): 'locked' | 'unlocked' {
					return this.instance.screenState;
				}

				public async start(options: { threshold: number; signal?: AbortSignal }): Promise<void> {
					detectorInstance = this.instance;
					void options;
				}

				public addEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
					this.instance.addEventListener(type, listener);
				}

				public removeEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
					this.instance.removeEventListener(type, listener);
				}
			},
			writable: true,
			configurable: true,
		});

		Object.defineProperty(navigator, 'permissions', {
			value: {
				query: vi.fn().mockResolvedValue({ state: 'granted' }),
			},
			writable: true,
			configurable: true,
		});

		const { result } = renderHook(() => useIdle(5000));

		await act(async () => {
			await Promise.resolve();
		});

		expect(result.current.idle).toBe(false);
		expect(detectorInstance).not.toBeNull();

		await act(async () => {
			detectorInstance?.emitChange({ userState: 'idle', screenState: 'unlocked' });
		});

		expect(result.current.idle).toBe(true);
	});

	it('should fallback to timer strategy when Idle Detection permission is denied', async () => {
		Object.defineProperty(window, 'IdleDetector', {
			value: class {
				public async start(): Promise<void> {
					return;
				}
			},
			writable: true,
			configurable: true,
		});

		Object.defineProperty(navigator, 'permissions', {
			value: {
				query: vi.fn().mockResolvedValue({ state: 'denied' }),
			},
			writable: true,
			configurable: true,
		});

		const { result } = renderHook(() => useIdle(1000));

		await act(async () => {
			await Promise.resolve();
		});

		act(() => {
			vi.advanceTimersByTime(1000);
		});

		expect(result.current.idle).toBe(true);
	});
});
