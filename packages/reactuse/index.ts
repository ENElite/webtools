import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';

type MaybeRefTarget<T> = T | RefObject<T | null> | null | undefined;

function isRefObject<T>(value: MaybeRefTarget<T>): value is RefObject<T | null> {
	return typeof value === 'object' && value !== null && 'current' in value;
}

function resolveTarget<T>(target: MaybeRefTarget<T>): T | null {
	if (isRefObject(target)) {
		return target.current;
	}

	return (target ?? null) as T | null;
}

const canUseDOM = typeof window !== 'undefined' && typeof document !== 'undefined';

export type MouseSourceType = 'mouse' | 'touch' | null;
export type UseMouseCoordType = 'page' | 'client' | 'screen' | 'movement';

export interface UseMouseOptions {
	target?: MaybeRefTarget<EventTarget>;
	type?: UseMouseCoordType;
	touch?: boolean;
	resetOnTouchEnds?: boolean;
	initialValue?: { x: number; y: number };
}

export interface UseMouseReturn {
	x: number;
	y: number;
	sourceType: MouseSourceType;
}

export function useMouse(options: UseMouseOptions = {}): UseMouseReturn {
	const {
		target,
		type = 'page',
		touch = true,
		resetOnTouchEnds = false,
		initialValue = { x: 0, y: 0 },
	} = options;

	const [x, setX] = useState(initialValue.x);
	const [y, setY] = useState(initialValue.y);
	const [sourceType, setSourceType] = useState<MouseSourceType>(null);

	useEffect(() => {
		if (!canUseDOM) {
			return;
		}

		const eventTarget = resolveTarget(target) ?? window;

		const updateFromMouseEvent = (event: MouseEvent): void => {
			setSourceType('mouse');

			switch (type) {
				case 'client':
					setX(event.clientX);
					setY(event.clientY);
					break;
				case 'screen':
					setX(event.screenX);
					setY(event.screenY);
					break;
				case 'movement':
					setX(event.movementX);
					setY(event.movementY);
					break;
				case 'page':
				default:
					setX(event.pageX);
					setY(event.pageY);
					break;
			}
		};

		const updateFromTouchEvent = (event: TouchEvent): void => {
			if (!touch) {
				return;
			}

			const currentTouch = event.touches[0] ?? event.changedTouches[0];
			if (!currentTouch) {
				return;
			}

			setSourceType('touch');

			switch (type) {
				case 'client':
					setX(currentTouch.clientX);
					setY(currentTouch.clientY);
					break;
				case 'screen':
					setX(currentTouch.screenX);
					setY(currentTouch.screenY);
					break;
				case 'movement':
					setX(0);
					setY(0);
					break;
				case 'page':
				default:
					setX(currentTouch.pageX);
					setY(currentTouch.pageY);
					break;
			}
		};

		const onTouchEnd = (): void => {
			if (!touch || !resetOnTouchEnds) {
				return;
			}

			setSourceType(null);
			setX(initialValue.x);
			setY(initialValue.y);
		};

		eventTarget.addEventListener?.('mousemove', updateFromMouseEvent as EventListener, { passive: true });
		if (touch) {
			eventTarget.addEventListener?.('touchstart', updateFromTouchEvent as EventListener, { passive: true });
			eventTarget.addEventListener?.('touchmove', updateFromTouchEvent as EventListener, { passive: true });
			eventTarget.addEventListener?.('touchend', onTouchEnd as EventListener, { passive: true });
		}

		return () => {
			eventTarget.removeEventListener?.('mousemove', updateFromMouseEvent as EventListener);
			if (touch) {
				eventTarget.removeEventListener?.('touchstart', updateFromTouchEvent as EventListener);
				eventTarget.removeEventListener?.('touchmove', updateFromTouchEvent as EventListener);
				eventTarget.removeEventListener?.('touchend', onTouchEnd as EventListener);
			}
		};
	}, [initialValue.x, initialValue.y, resetOnTouchEnds, target, touch, type]);

	return { x, y, sourceType };
}

export interface UseIdleOptions {
	events?: string[];
	listenForVisibilityChange?: boolean;
	initialState?: boolean;
}

export interface UseIdleReturn {
	idle: boolean;
	lastActive: number;
	reset: () => void;
}

type IdlePermissionState = 'granted' | 'denied' | 'prompt';

interface IdlePermissionStatus {
	state: IdlePermissionState;
}

interface IdleDetectorLike extends EventTarget {
	userState: 'active' | 'idle';
	screenState: 'locked' | 'unlocked';
	start(options: { threshold: number; signal?: AbortSignal }): Promise<void>;
}

declare global {
	interface Window {
		IdleDetector?: {
			new (): IdleDetectorLike;
		};
	}
}

const DEFAULT_IDLE_EVENTS = ['mousemove', 'mousedown', 'resize', 'keydown', 'touchstart', 'wheel'];

export function useIdle(timeout = 60_000, options: UseIdleOptions = {}): UseIdleReturn {
	const {
		events = DEFAULT_IDLE_EVENTS,
		listenForVisibilityChange = true,
		initialState = false,
	} = options;

	const [idle, setIdle] = useState(initialState);
	const [lastActive, setLastActive] = useState(() => Date.now());
	const timeoutRef = useRef<number | null>(null);
	const idleDetectorRef = useRef<IdleDetectorLike | null>(null);
	const idleAbortRef = useRef<AbortController | null>(null);

	const clearCurrentTimeout = useCallback((): void => {
		if (timeoutRef.current !== null) {
			window.clearTimeout(timeoutRef.current);
			timeoutRef.current = null;
		}
	}, []);

	const schedule = useCallback((): void => {
		if (!canUseDOM) {
			return;
		}

		clearCurrentTimeout();
		if (timeout <= 0) {
			setIdle(true);
			return;
		}

		timeoutRef.current = window.setTimeout(() => {
			setIdle(true);
		}, timeout);
	}, [clearCurrentTimeout, timeout]);

	const reset = useCallback((): void => {
		setIdle(false);
		setLastActive(Date.now());
		schedule();
	}, [schedule]);

	const clearIdleDetector = useCallback((): void => {
		idleAbortRef.current?.abort();
		idleAbortRef.current = null;
		idleDetectorRef.current = null;
	}, []);

	useEffect(() => {
		if (!canUseDOM) {
			return;
		}

		let fallbackCleanup: (() => void) | null = null;
		let cancelled = false;

		const setupFallback = (): void => {
			const onActivity = (): void => {
				reset();
			};

			events.forEach((eventName) => {
				window.addEventListener(eventName, onActivity, { passive: true });
			});

			const onVisibilityChange = (): void => {
				if (document.visibilityState === 'visible') {
					onActivity();
				}
			};

			if (listenForVisibilityChange) {
				document.addEventListener('visibilitychange', onVisibilityChange, { passive: true });
			}

			schedule();

			fallbackCleanup = () => {
				events.forEach((eventName) => {
					window.removeEventListener(eventName, onActivity);
				});

				if (listenForVisibilityChange) {
					document.removeEventListener('visibilitychange', onVisibilityChange);
				}

				clearCurrentTimeout();
			};
		};

		const setupIdleDetector = async (): Promise<boolean> => {
			const IdleDetectorCtor = window.IdleDetector;
			if (!IdleDetectorCtor || typeof navigator.permissions?.query !== 'function') {
				return false;
			}

			try {
				const permissionStatus = await navigator.permissions.query({ name: 'idle-detection' as PermissionName }) as IdlePermissionStatus;
				if (permissionStatus.state !== 'granted' || cancelled) {
					return false;
				}

				const controller = new AbortController();
				idleAbortRef.current = controller;
				const detector = new IdleDetectorCtor();
				idleDetectorRef.current = detector;

				const onChange = (): void => {
					const nextIdle = detector.userState === 'idle' || detector.screenState === 'locked';
					setIdle(nextIdle);
					if (!nextIdle) {
						setLastActive(Date.now());
					}
				};

				detector.addEventListener('change', onChange as EventListener);
				await detector.start({ threshold: Math.max(timeout, 1000), signal: controller.signal });
				onChange();

				fallbackCleanup = () => {
					detector.removeEventListener('change', onChange as EventListener);
					clearIdleDetector();
				};

				return true;
			} catch {
				clearIdleDetector();
				return false;
			}
		};

		void setupIdleDetector().then((isNativeEnabled) => {
			if (!isNativeEnabled && !cancelled) {
				setupFallback();
			}
		});

		return () => {
			cancelled = true;
			fallbackCleanup?.();
			clearIdleDetector();
			clearCurrentTimeout();
		};
	}, [clearCurrentTimeout, clearIdleDetector, events, listenForVisibilityChange, reset, schedule, timeout]);

	return { idle, lastActive, reset };
}

export function useDocumentVisibility(): DocumentVisibilityState {
	const [visibility, setVisibility] = useState<DocumentVisibilityState>(() => {
		if (!canUseDOM) {
			return 'hidden';
		}

		return document.visibilityState;
	});

	useEffect(() => {
		if (!canUseDOM) {
			return;
		}

		const onVisibilityChange = (): void => {
			setVisibility(document.visibilityState);
		};

		document.addEventListener('visibilitychange', onVisibilityChange, { passive: true });

		return () => {
			document.removeEventListener('visibilitychange', onVisibilityChange);
		};
	}, []);

	return visibility;
}

export interface UseFullscreenOptions {
	target?: MaybeRefTarget<Element>;
}

export interface UseFullscreenReturn {
	isSupported: boolean;
	isFullscreen: boolean;
	enter: () => Promise<void>;
	exit: () => Promise<void>;
	toggle: () => Promise<void>;
}

export function useFullscreen(options: UseFullscreenOptions = {}): UseFullscreenReturn {
	const { target } = options;
	const isSupported = canUseDOM && typeof document.documentElement.requestFullscreen === 'function';

	const [isFullscreen, setIsFullscreen] = useState<boolean>(() => {
		if (!canUseDOM) {
			return false;
		}

		return document.fullscreenElement !== null;
	});

	useEffect(() => {
		if (!canUseDOM) {
			return;
		}

		const onChange = (): void => {
			setIsFullscreen(document.fullscreenElement !== null);
		};

		document.addEventListener('fullscreenchange', onChange);

		return () => {
			document.removeEventListener('fullscreenchange', onChange);
		};
	}, []);

	const enter = useCallback(async (): Promise<void> => {
		if (!isSupported || !canUseDOM) {
			return;
		}

		const element = resolveTarget(target) ?? document.documentElement;
		if (document.fullscreenElement !== element) {
			await element.requestFullscreen?.();
		}
	}, [isSupported, target]);

	const exit = useCallback(async (): Promise<void> => {
		if (!isSupported || !canUseDOM) {
			return;
		}

		if (document.fullscreenElement !== null) {
			await document.exitFullscreen();
		}
	}, [isSupported]);

	const toggle = useCallback(async (): Promise<void> => {
		if (isFullscreen) {
			await exit();
			return;
		}

		await enter();
	}, [enter, exit, isFullscreen]);

	return { isSupported, isFullscreen, enter, exit, toggle };
}

export interface UseTimestampOptions {
	offset?: number;
	interval?: number | 'requestAnimationFrame';
	immediate?: boolean;
}

export interface UseTimestampReturn {
	timestamp: number;
	isActive: boolean;
	pause: () => void;
	resume: () => void;
}

export function useTimestamp(options: UseTimestampOptions = {}): UseTimestampReturn {
	const {
		offset = 0,
		interval = 'requestAnimationFrame',
		immediate = true,
	} = options;

	const [timestamp, setTimestamp] = useState(() => Date.now() + offset);
	const [isActive, setIsActive] = useState(immediate);

	const frameRef = useRef<number | null>(null);
	const intervalRef = useRef<number | null>(null);

	const clearTicker = useCallback((): void => {
		if (!canUseDOM) {
			return;
		}

		if (frameRef.current !== null) {
			window.cancelAnimationFrame(frameRef.current);
			frameRef.current = null;
		}

		if (intervalRef.current !== null) {
			window.clearInterval(intervalRef.current);
			intervalRef.current = null;
		}
	}, []);

	const tick = useCallback((): void => {
		setTimestamp(Date.now() + offset);
	}, [offset]);

	const resume = useCallback((): void => {
		if (!canUseDOM) {
			return;
		}

		setIsActive(true);
	}, []);

	const pause = useCallback((): void => {
		setIsActive(false);
	}, []);

	useEffect(() => {
		if (!canUseDOM || !isActive) {
			clearTicker();
			return;
		}

		tick();

		if (interval === 'requestAnimationFrame') {
			const loop = (): void => {
				tick();
				frameRef.current = window.requestAnimationFrame(loop);
			};

			frameRef.current = window.requestAnimationFrame(loop);
			return () => {
				clearTicker();
			};
		}

		intervalRef.current = window.setInterval(tick, Math.max(interval, 1));
		return () => {
			clearTicker();
		};
	}, [clearTicker, interval, isActive, tick]);

	useEffect(() => {
		return () => {
			clearTicker();
		};
	}, [clearTicker]);

	return { timestamp, isActive, pause, resume };
}

export interface UseDisplayMediaReturn {
	isSupported: boolean;
	isActive: boolean;
	stream: MediaStream | null;
	error: Error | null;
	start: (options?: DisplayMediaStreamOptions) => Promise<MediaStream | null>;
	stop: () => void;
}

const DEFAULT_DISPLAY_MEDIA_OPTIONS: DisplayMediaStreamOptions = {
	video: true,
	audio: false,
};

export function useDisplayMedia(initialOptions: DisplayMediaStreamOptions = DEFAULT_DISPLAY_MEDIA_OPTIONS): UseDisplayMediaReturn {
	const [stream, setStream] = useState<MediaStream | null>(null);
	const [error, setError] = useState<Error | null>(null);
	const streamRef = useRef<MediaStream | null>(null);

	const isSupported = useMemo(() => {
		if (!canUseDOM) {
			return false;
		}

		return typeof navigator.mediaDevices?.getDisplayMedia === 'function';
	}, []);

	const stop = useCallback((): void => {
		const currentStream = streamRef.current;
		if (!currentStream) {
			return;
		}

		currentStream.getTracks().forEach((track) => {
			track.stop();
		});

		streamRef.current = null;
		setStream(null);
	}, []);

	const start = useCallback(async (options?: DisplayMediaStreamOptions): Promise<MediaStream | null> => {
		if (!isSupported || !canUseDOM) {
			const unsupportedError = new Error('useDisplayMedia is not supported in this environment.');
			setError(unsupportedError);
			return null;
		}

		try {
			setError(null);

			const nextStream = await navigator.mediaDevices.getDisplayMedia(options ?? initialOptions);
			streamRef.current = nextStream;
			setStream(nextStream);

			nextStream.getTracks().forEach((track) => {
				track.addEventListener('ended', () => {
					if (streamRef.current === nextStream) {
						streamRef.current = null;
						setStream(null);
					}
				}, { once: true });
			});

			return nextStream;
		} catch (unknownError) {
			const normalizedError = unknownError instanceof Error ? unknownError : new Error('Failed to start display media.');
			setError(normalizedError);
			return null;
		}
	}, [initialOptions, isSupported]);

	useEffect(() => {
		return () => {
			stop();
		};
	}, [stop]);

	return {
		isSupported,
		isActive: stream !== null,
		stream,
		error,
		start,
		stop,
	};
}

interface WakeLockSentinelLike {
	released: boolean;
	release: () => Promise<void>;
	addEventListener: (type: 'release', listener: () => void, options?: AddEventListenerOptions) => void;
	removeEventListener: (type: 'release', listener: () => void) => void;
}

interface WakeLockLike {
	request: (type?: 'screen') => Promise<WakeLockSentinelLike>;
}

type NavigatorWithWakeLock = Navigator & {
	wakeLock?: WakeLockLike;
};

export interface UseWakeLockReturn {
	isSupported: boolean;
	isActive: boolean;
	error: Error | null;
	request: () => Promise<boolean>;
	release: () => Promise<void>;
}

export function useWakeLock(): UseWakeLockReturn {
	const [isActive, setIsActive] = useState(false);
	const [error, setError] = useState<Error | null>(null);
	const sentinelRef = useRef<WakeLockSentinelLike | null>(null);

	const isSupported = useMemo(() => {
		if (!canUseDOM) {
			return false;
		}

		return typeof (navigator as NavigatorWithWakeLock).wakeLock?.request === 'function';
	}, []);

	const release = useCallback(async (): Promise<void> => {
		const sentinel = sentinelRef.current;
		if (!sentinel) {
			setIsActive(false);
			return;
		}

		try {
			await sentinel.release();
		} catch (unknownError) {
			const normalizedError = unknownError instanceof Error ? unknownError : new Error('Failed to release wake lock.');
			setError(normalizedError);
		} finally {
			sentinelRef.current = null;
			setIsActive(false);
		}
	}, []);

	const request = useCallback(async (): Promise<boolean> => {
		if (!isSupported || !canUseDOM) {
			const unsupportedError = new Error('Wake Lock is not supported in this environment.');
			setError(unsupportedError);
			setIsActive(false);
			return false;
		}

		try {
			setError(null);

			if (sentinelRef.current && !sentinelRef.current.released) {
				setIsActive(true);
				return true;
			}

			const wakeLock = (navigator as NavigatorWithWakeLock).wakeLock;
			if (!wakeLock) {
				setIsActive(false);
				return false;
			}

			const sentinel = await wakeLock.request('screen');
			sentinelRef.current = sentinel;
			setIsActive(true);

			sentinel.addEventListener('release', () => {
				sentinelRef.current = null;
				setIsActive(false);
			}, { once: true });

			return true;
		} catch (unknownError) {
			const normalizedError = unknownError instanceof Error ? unknownError : new Error('Failed to request wake lock.');
			setError(normalizedError);
			sentinelRef.current = null;
			setIsActive(false);
			return false;
		}
	}, [isSupported]);

	useEffect(() => {
		if (!canUseDOM) {
			return;
		}

		const onVisibilityChange = (): void => {
			if (document.visibilityState === 'hidden') {
				setIsActive(false);
			}
		};

		document.addEventListener('visibilitychange', onVisibilityChange, { passive: true });

		return () => {
			document.removeEventListener('visibilitychange', onVisibilityChange);
			void release();
		};
	}, [release]);

	return {
		isSupported,
		isActive,
		error,
		request,
		release,
	};
}
