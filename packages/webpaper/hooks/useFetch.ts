import { useCallback, useEffect, useRef, useState, type DependencyList } from 'react';

/**
 * Fetch context object passed to all lifecycle callbacks
 */
export interface UseFetchContext<T = unknown> {
    /** The fetch request URL */
    url: string;
    /** The fetch request options */
    options: RequestInit;
    /** The response object (null if not yet fetched or failed) */
    response: Response | null;
    /** The parsed response data (type depends on format method) */
    data: T | null;
    /** The error if the fetch failed */
    error: Error | null;
    /** Whether the fetch is currently in progress */
    isFetching: boolean;
    /** Whether the fetch was aborted */
    aborted: boolean;
}

/**
 * Lifecycle callback for before fetch
 */
export type BeforeFetchFn<T = unknown> = (ctx: UseFetchContext<T>) => void | Promise<void>;

/**
 * Lifecycle callback for after fetch
 */
export type AfterFetchFn<T = unknown> = (ctx: UseFetchContext<T>) => void | Promise<void>;

/**
 * Lifecycle callback for response
 */
export type OnResponseFn<T = unknown> = (ctx: UseFetchContext<T>) => void | Promise<void>;

/**
 * Lifecycle callback for error
 */
export type OnErrorFn<T = unknown> = (ctx: UseFetchContext<T>) => void | Promise<void>;

/**
 * Lifecycle callback for finally
 */
export type OnFinallyFn = () => void | Promise<void>;

/**
 * Options for configuring useFetch behavior
 */
export interface UseFetchOptions<T = unknown> {
    /** Whether to immediately send the request (default: true) */
    immediate?: boolean;
    /** Whether to refetch when dependencies change (default: true) */
    refetch?: boolean;
    /** Callback executed before fetch starts */
    beforeFetch?: BeforeFetchFn<T>;
    /** Callback executed after fetch completes successfully */
    afterFetch?: AfterFetchFn<T>;
    /** Callback executed when response is received */
    onResponse?: OnResponseFn<T>;
    /** Callback executed when fetch fails */
    onError?: OnErrorFn<T>;
    /** Callback executed finally (both success and error) */
    onFinally?: OnFinallyFn;
    /** Dependency array to trigger refetch (similar to useEffect deps) */
    deps?: DependencyList;
    /** Number of retries (not including the initial attempt), or 'inf' for infinite retries */
    retry?: number | 'inf';
    /** Retry delay in milliseconds, or 'auto' for exponential backoff, or undefined for immediate retry */
    retryDelay?: number | 'auto';
}

/**
 * Response parser function type
 */
export type ResponseParser<T> = (response: Response) => Promise<T>;

/**
 * Chainable methods for setting response format
 */
export interface DataFormatMethods<T = unknown> {
    /** Parse response as JSON */
    json<U = T>(): UseFetchReturn<U>;
    /** Parse response as text */
    text(): UseFetchReturn<string>;
    /** Parse response as Blob */
    blob(): UseFetchReturn<Blob>;
    /** Parse response as ArrayBuffer */
    arrayBuffer(): UseFetchReturn<ArrayBuffer>;
    /** Use custom parser */
    custom<U = T>(parser: ResponseParser<U>): UseFetchReturn<U>;
}

/**
 * Chainable methods for HTTP verbs
 */
export interface HttpMethodChains<T = unknown> {
    /** Chain with GET method */
    get(): UseFetchReturn<T>;
    /** Chain with POST method */
    post(): UseFetchReturn<T>;
    /** Chain with PUT method */
    put(): UseFetchReturn<T>;
    /** Chain with DELETE method */
    delete(): UseFetchReturn<T>;
    /** Chain with PATCH method */
    patch(): UseFetchReturn<T>;
    /** Chain with HEAD method */
    head(): UseFetchReturn<T>;
    /** Chain with OPTIONS method */
    options(): UseFetchReturn<T>;
}

/**
 * Return value of useFetch hook
 */
export interface UseFetchReturn<T = unknown>
    extends DataFormatMethods<T>,
    HttpMethodChains<T> {
    /** The fetched data */
    data: T | null;
    /** Whether the request is currently in progress */
    isFetching: boolean;
    /** Error from the fetch request */
    error: Error | null;
    /** Whether the request was aborted */
    aborted: boolean;
    /** Whether the request can be aborted */
    canAbort: boolean;
    /** The response object */
    response: Response | null;
    /** Abort the current request */
    abort: () => void;
    /** Manually execute the fetch request */
    execute: (opts?: RequestInit) => Promise<Response | null>;
    /** Register a response callback */
    onResponse: (callback: OnResponseFn<T>) => UseFetchReturn<T>;
    /** Register an error callback */
    onError: (callback: OnErrorFn<T>) => UseFetchReturn<T>;
    /** Register a finally callback */
    onFinally: (callback: OnFinallyFn) => UseFetchReturn<T>;
    /** Update the fetch URL and optionally execute */
    updateUrl: (url: string, execute?: boolean) => Promise<Response | null>;
    /** Refetch the current request */
    refetch: () => Promise<Response | null>;
}

/**
 * Internal state for managing fetch operations
 */
interface FetchState<T = unknown> {
    data: T | null;
    error: Error | null;
    isFetching: boolean;
    aborted: boolean;
    response: Response | null;
}

function isAbsoluteUrl(url: string): boolean {
    return /^[a-z][a-z\d+\-.]*:\/\//i.test(url) || url.startsWith('//');
}

function joinUrl(baseUrl: string, url: string): string {
    if (!baseUrl || isAbsoluteUrl(url)) {
        return url;
    }

    const baseEndsWithSlash = baseUrl.endsWith('/');
    const urlStartsWithSlash = url.startsWith('/');

    if (baseEndsWithSlash && urlStartsWithSlash) {
        return `${baseUrl}${url.slice(1)}`;
    }
    if (!baseEndsWithSlash && !urlStartsWithSlash) {
        return `${baseUrl}/${url}`;
    }
    return `${baseUrl}${url}`;
}

function composeCtxCallback<T>(
    baseFn?: (ctx: UseFetchContext<T>) => void | Promise<void>,
    overrideFn?: (ctx: UseFetchContext<T>) => void | Promise<void>,
): ((ctx: UseFetchContext<T>) => Promise<void>) | undefined {
    if (!baseFn && !overrideFn) {
        return undefined;
    }

    return async (ctx: UseFetchContext<T>) => {
        if (baseFn) {
            await baseFn(ctx);
        }
        if (overrideFn) {
            await overrideFn(ctx);
        }
    };
}

function composeFinallyCallback(baseFn?: OnFinallyFn, overrideFn?: OnFinallyFn): OnFinallyFn | undefined {
    if (!baseFn && !overrideFn) {
        return undefined;
    }

    return async () => {
        if (baseFn) {
            await baseFn();
        }
        if (overrideFn) {
            await overrideFn();
        }
    };
}

function mergeFetchConfig<T>(baseConfig: UseFetchOptions<T>, config: UseFetchOptions<T>): UseFetchOptions<T> {
    const mergedDeps = [...(baseConfig.deps ?? []), ...(config.deps ?? [])];

    return {
        immediate: config.immediate ?? baseConfig.immediate,
        refetch: config.refetch ?? baseConfig.refetch,
        retry: config.retry ?? baseConfig.retry,
        retryDelay: config.retryDelay ?? baseConfig.retryDelay,
        deps: mergedDeps,
        beforeFetch: composeCtxCallback(baseConfig.beforeFetch, config.beforeFetch),
        afterFetch: composeCtxCallback(baseConfig.afterFetch, config.afterFetch),
        onResponse: composeCtxCallback(baseConfig.onResponse, config.onResponse),
        onError: composeCtxCallback(baseConfig.onError, config.onError),
        onFinally: composeFinallyCallback(baseConfig.onFinally, config.onFinally),
    };
}

/**
 * useFetch hook implementation
 * @param url - The URL to fetch from
 * @param options - Fetch request options
 * @param config - useFetch configuration
 * @returns UseFetchReturn object with data, methods, and state
 *
 * @example
 * const { data, isFetching, error } = useFetch('/api/users', {}, { immediate: true });
 *
 * @example
 * const { data, execute } = useFetch('/api/data', {}, { immediate: false });
 * const onClick = () => execute();
 */
export function useFetch<T = unknown>(
    url: string,
    options: RequestInit = {},
    config: UseFetchOptions<T> = {},
): UseFetchReturn<T> {
    const {
        immediate = true,
        refetch: shouldRefetch = true,
        beforeFetch,
        afterFetch,
        onResponse,
        onError,
        onFinally,
        deps = [],
    } = config;

    // State management
    const [state, setState] = useState<FetchState<T>>({
        data: null,
        error: null,
        isFetching: false,
        aborted: false,
        response: null,
    });

    // Refs for managing fetch lifecycle
    const abortControllerRef = useRef<AbortController | null>(null);
    const urlRef = useRef(url);
    const optionsRef = useRef(options);
    const callbacksRef = useRef({
        onResponse: onResponse,
        onError: onError,
        onFinally: onFinally,
    });

    // Update refs when they change
    useEffect(() => {
        urlRef.current = url;
        optionsRef.current = options;
        callbacksRef.current = {
            onResponse,
            onError,
            onFinally,
        };
    }, [url, options, onResponse, onError, onFinally]);

    /**
     * Abort the current fetch request
     */
    const abort = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
    }, []);

    /**
     * Execute the fetch request
     */
    /**
     * Parse response data
     */
    const parseResponseData = useCallback(
        async <U = T>(response: Response | null, parser: ResponseParser<U> = (r) => r.json() as Promise<any>) => {
            if (!response) {
                return;
            }

            try {
                const data = await parser(response.clone());
                setState((prev) => ({
                    ...prev,
                    data: data as unknown as T,
                }));
            } catch (err) {
                const error = err instanceof Error ? err : new Error(String(err));
                setState((prev) => ({
                    ...prev,
                    error,
                }));
            }
        },
        [],
    );

    const execute = useCallback(
        async (executionOptions?: RequestInit): Promise<Response | null> => {
            // Cancel previous request
            abort();

            const currentUrl = urlRef.current;
            const currentOptions = { ...optionsRef.current, ...executionOptions };

            // Retry configuration
            const retryOpt = (config as UseFetchOptions<T> | undefined)?.retry ?? undefined;
            const retryDelayOpt = (config as UseFetchOptions<T> | undefined)?.retryDelay ?? undefined;

            const maxAttempts = retryOpt === 'inf' ? Infinity : (typeof retryOpt === 'number' ? retryOpt + 1 : 1);
            let attempt = 0;

            // helper to wait
            const wait = (ms: number) => new Promise((res) => setTimeout(res, ms));

            while (attempt < maxAttempts) {
                attempt += 1;

                const abortController = new AbortController();
                abortControllerRef.current = abortController;

                const ctx: UseFetchContext<T> = {
                    url: currentUrl,
                    options: currentOptions,
                    response: null,
                    data: null,
                    error: null,
                    isFetching: true,
                    aborted: false,
                };

                setState((prev) => ({
                    ...prev,
                    isFetching: true,
                    aborted: false,
                }));

                try {
                    // Call beforeFetch callback
                    if (beforeFetch) {
                        await beforeFetch(ctx);
                    }

                    // Perform fetch
                    const response = await fetch(currentUrl, {
                        ...currentOptions,
                        signal: abortController.signal,
                    });

                    // Check if aborted
                    if (abortController.signal.aborted) {
                        setState((prev) => ({
                            ...prev,
                            isFetching: false,
                            aborted: true,
                        }));
                        return null;
                    }

                    ctx.response = response;

                    // Call afterFetch callback
                    if (afterFetch) {
                        await afterFetch(ctx);
                    }

                    // Call onResponse callback
                    if (callbacksRef.current.onResponse) {
                        await callbacksRef.current.onResponse(ctx);
                    }

                    setState((prev) => ({
                        ...prev,
                        response,
                        isFetching: false,
                    }));

                    // Call onFinally callbacks
                    if (onFinally) {
                        await onFinally();
                    }
                    if (callbacksRef.current.onFinally && callbacksRef.current.onFinally !== onFinally) {
                        await callbacksRef.current.onFinally();
                    }

                    return response;
                } catch (err) {
                    const error = err instanceof Error ? err : new Error(String(err));

                    // If aborted, stop retrying
                    if (abortController.signal.aborted) {
                        setState((prev) => ({
                            ...prev,
                            isFetching: false,
                            aborted: true,
                        }));
                        if (onFinally) {
                            await onFinally();
                        }
                        if (callbacksRef.current.onFinally && callbacksRef.current.onFinally !== onFinally) {
                            await callbacksRef.current.onFinally();
                        }
                        return null;
                    }

                    // Decide whether to retry
                    const willRetry = attempt < maxAttempts;

                    if (!willRetry) {
                        // final failure: call error handlers
                        ctx.error = error;

                        if (onError) {
                            await onError(ctx);
                        }
                        if (callbacksRef.current.onError && callbacksRef.current.onError !== onError) {
                            await callbacksRef.current.onError(ctx);
                        }

                        setState((prev) => ({
                            ...prev,
                            error,
                            isFetching: false,
                        }));

                        if (onFinally) {
                            await onFinally();
                        }
                        if (callbacksRef.current.onFinally && callbacksRef.current.onFinally !== onFinally) {
                            await callbacksRef.current.onFinally();
                        }

                        return null;
                    }

                    // Otherwise wait according to retryDelayOpt
                    if (retryDelayOpt === undefined) {
                        // immediate retry
                    } else if (retryDelayOpt === 'auto') {
                        // exponential backoff: base 100ms
                        const base = 100;
                        const delay = Math.min(10000, base * Math.pow(2, attempt - 1));
                        // eslint-disable-next-line no-await-in-loop
                        await wait(delay);
                    } else if (typeof retryDelayOpt === 'number') {
                        // eslint-disable-next-line no-await-in-loop
                        await wait(retryDelayOpt);
                    }

                    // continue to next attempt
                } finally {
                    // Clear abort controller if still set to this one
                    if (abortControllerRef.current && abortControllerRef.current.signal.aborted) {
                        abortControllerRef.current = null;
                    }
                }
            }

            return null;
        },
        [abort, beforeFetch, afterFetch, onError, onFinally, config, parseResponseData],
    );

    /**
     * Refetch with current parameters
     */
    const refetch = useCallback(async () => {
        return execute(optionsRef.current);
    }, [execute]);

    /**
     * Update URL and optionally execute
     */
    const updateUrl = useCallback(
        async (newUrl: string, shouldExecute = true) => {
            urlRef.current = newUrl;
            if (shouldExecute) {
                return execute(optionsRef.current);
            }
            return state.response;
        },
        [execute, state.response],
    );

    /**
     * Register response callback
     */
    // declare returnValue early so callbacks can reference it safely
    let returnValue = {} as UseFetchReturn<T>;

    const registerOnResponse = useCallback((callback: OnResponseFn<T>): UseFetchReturn<T> => {
        callbacksRef.current.onResponse = callback;
        return returnValue;
    }, []);

    /**
     * Register error callback
     */
    const registerOnError = useCallback((callback: OnErrorFn<T>): UseFetchReturn<T> => {
        callbacksRef.current.onError = callback;
        return returnValue;
    }, []);

    /**
     * Register finally callback
     */
    const registerOnFinally = useCallback((callback: OnFinallyFn): UseFetchReturn<T> => {
        callbacksRef.current.onFinally = callback;
        return returnValue;
    }, []);

    /**
     * Chain with HTTP method
     */
    const chainHttpMethod = useCallback(
        (method: string): UseFetchReturn<T> => {
            optionsRef.current = { ...optionsRef.current, method };
            return returnValue;
        },
        [],
    );

    /**
     * Chain with response format
     */
    const chainResponseFormat = useCallback(
        <U,>(parser: ResponseParser<U>): UseFetchReturn<U> => {
            // This is a type transformation, create a new return value with the parser
            const newExecute = async (executionOptions?: RequestInit) => {
                const response = await execute(executionOptions);
                if (response) {
                    await parseResponseData(response, parser);
                }
                return response;
            };

            // Return a modified return value with the new parser applied
            return {
                ...(returnValue as unknown as UseFetchReturn<any>),
                execute: newExecute,
            } as UseFetchReturn<U>;
        },
        [execute, parseResponseData],
    );

    // Execute on mount if immediate
    useEffect(() => {
        if (immediate) {
            void execute(optionsRef.current);
        }
    }, [immediate, execute]);

    // Refetch on dependency change
    useEffect(() => {
        if (shouldRefetch && !immediate) {
            void execute(optionsRef.current);
        }
    }, deps); // eslint-disable-line react-hooks/exhaustive-deps

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            abort();
        };
    }, [abort]);

    // Build return value
    returnValue = {
        // State
        data: state.data,
        isFetching: state.isFetching,
        error: state.error,
        aborted: state.aborted,
        canAbort: abortControllerRef.current !== null,
        response: state.response,

        // Methods
        abort,
        execute,
        refetch,
        updateUrl,
        onResponse: registerOnResponse,
        onError: registerOnError,
        onFinally: registerOnFinally,

        // HTTP method chains
        get: () => chainHttpMethod('GET'),
        post: () => chainHttpMethod('POST'),
        put: () => chainHttpMethod('PUT'),
        delete: () => chainHttpMethod('DELETE'),
        patch: () => chainHttpMethod('PATCH'),
        head: () => chainHttpMethod('HEAD'),
        options: () => chainHttpMethod('OPTIONS'),

        // Format chains
        json: <U = T>() => chainResponseFormat<U>((r) => r.json() as Promise<U>),
        text: () => chainResponseFormat<string>((r) => r.text()),
        blob: () => chainResponseFormat<Blob>((r) => r.blob()),
        arrayBuffer: () => chainResponseFormat<ArrayBuffer>((r) => r.arrayBuffer()),
        custom: (parser) => chainResponseFormat(parser),
    };

    return returnValue;
}

/**
 * Factory that preconfigures a useFetch hook with base url and default options/config.
 */
export function createFetch(
    baseUrl: string,
    baseOptions: RequestInit = {},
    baseConfig: UseFetchOptions<any> = {},
) {
    return function useConfiguredFetch<T = unknown>(
        url: string,
        options: RequestInit = {},
        config: UseFetchOptions<T> = {},
    ): UseFetchReturn<T> {
        const mergedOptions: RequestInit = {
            ...baseOptions,
            ...options,
            headers: {
                ...(baseOptions.headers ?? {}),
                ...(options.headers ?? {}),
            },
        };

        const mergedConfig = mergeFetchConfig(baseConfig as UseFetchOptions<T>, config);
        const fullUrl = joinUrl(baseUrl, url);

        return useFetch<T>(fullUrl, mergedOptions, mergedConfig);
    };
}
