
import { useEffect, useState } from 'react';

type PreloadStatus = 'idle' | 'loading' | 'loaded' | 'error';

const preloadedUrls = new Set<string>();

function normalizeUrl(candidate: string): string {
	const trimmed = candidate.trim();
	if (!trimmed) {
		return '';
	}

	try {
		const base = typeof window === 'undefined' ? 'http://localhost/' : window.location.href;
		return new URL(trimmed, base).href;
	} catch {
		return trimmed;
	}
}

export function usePreloadImage(url: string | null | undefined): PreloadStatus {
	const [status, setStatus] = useState<PreloadStatus>('idle');

	useEffect(() => {
		const normalized = normalizeUrl(url ?? '');
		if (!normalized) {
			setStatus('idle');
			return;
		}

		if (preloadedUrls.has(normalized)) {
			setStatus('loaded');
			return;
		}

		let cancelled = false;
		setStatus('loading');

		const image = new Image();
		image.referrerPolicy = 'no-referrer';
		image.decoding = 'async';
		image.loading = 'eager';
		image.onload = () => {
			if (cancelled) {
				return;
			}
			preloadedUrls.add(normalized);
			setStatus('loaded');
		};
		image.onerror = () => {
			if (cancelled) {
				return;
			}
			setStatus('error');
		};
		image.src = normalized;

		return () => {
			cancelled = true;
			image.onload = null;
			image.onerror = null;
		};
	}, [url]);

	return status;
}