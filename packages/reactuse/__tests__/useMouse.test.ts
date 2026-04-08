import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useMouse } from '../index';

describe('useMouse', () => {
	let target: HTMLDivElement;

	beforeEach(() => {
		target = document.createElement('div');
		Object.assign(target, {
			getBoundingClientRect: () => ({
				left: 0,
				top: 0,
				width: 100,
				height: 100,
				right: 100,
				bottom: 100,
				x: 0,
				y: 0,
				toJSON: () => ({}),
			}),
		});
	});

	it('should initialize with default values', () => {
		const { result } = renderHook(() => useMouse());
		expect(result.current.x).toBe(0);
		expect(result.current.y).toBe(0);
		expect(result.current.sourceType).toBeNull();
	});

	it('should initialize with custom values', () => {
		const { result } = renderHook(() => useMouse({ initialValue: { x: 10, y: 20 } }));
		expect(result.current.x).toBe(10);
		expect(result.current.y).toBe(20);
	});

	it('should track mouse movements', () => {
		const { result } = renderHook(() => useMouse());

		act(() => {
			const event = new MouseEvent('mousemove', {
				clientX: 50,
				clientY: 75,
				bubbles: true,
			});
			window.dispatchEvent(event);
		});

		expect(result.current.x).toBe(50);
		expect(result.current.y).toBe(75);
		expect(result.current.sourceType).toBe('mouse');
	});

	it('should support different coordinate types', () => {
		const { result } = renderHook(() => useMouse({ type: 'client' }));

		act(() => {
			const event = new MouseEvent('mousemove', {
				clientX: 30,
				clientY: 40,
				bubbles: true,
			});
			window.dispatchEvent(event);
		});

		expect(result.current.x).toBe(30);
		expect(result.current.y).toBe(40);
	});

	it('should handle touch events', () => {
		const { result } = renderHook(() => useMouse({ touch: true }));

		act(() => {
			const event = new TouchEvent('touchstart', {
				touches: [
					{
						identifier: 0,
						target: window,
						clientX: 25,
						clientY: 35,
						screenX: 25,
						screenY: 35,
						pageX: 25,
						pageY: 35,
						radiusX: 0,
						radiusY: 0,
						rotationAngle: 0,
						force: 1,
					} as any,
				],
				bubbles: true,
			});
			window.dispatchEvent(event);
		});

		expect(result.current.sourceType).toBe('touch');
	});

	it('should reset on touch end when resetOnTouchEnds is true', () => {
		const { result } = renderHook(() => useMouse({ touch: true, resetOnTouchEnds: true, initialValue: { x: 0, y: 0 } }));

		act(() => {
			const startEvent = new TouchEvent('touchstart', {
				touches: [
					{
						identifier: 0,
						target: window,
						clientX: 25,
						clientY: 35,
						screenX: 25,
						screenY: 35,
						pageX: 25,
						pageY: 35,
						radiusX: 0,
						radiusY: 0,
						rotationAngle: 0,
						force: 1,
					} as any,
				],
				bubbles: true,
			});
			window.dispatchEvent(startEvent);
		});

		expect(result.current.x).toBe(25);

		act(() => {
			const endEvent = new TouchEvent('touchend', {
				changedTouches: [] as any,
				bubbles: true,
			});
			window.dispatchEvent(endEvent);
		});

		expect(result.current.x).toBe(0);
		expect(result.current.y).toBe(0);
		expect(result.current.sourceType).toBeNull();
	});

	it('should not track events when touch is disabled', () => {
		const { result } = renderHook(() => useMouse({ touch: false }));

		act(() => {
			const event = new TouchEvent('touchstart', {
				touches: [
					{
						identifier: 0,
						target: window,
						clientX: 25,
						clientY: 35,
						screenX: 25,
						screenY: 35,
						pageX: 25,
						pageY: 35,
						radiusX: 0,
						radiusY: 0,
						rotationAngle: 0,
						force: 1,
					} as any,
				],
				bubbles: true,
			});
			window.dispatchEvent(event);
		});

		expect(result.current.sourceType).toBeNull();
	});
});
