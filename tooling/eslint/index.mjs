import js from '@eslint/js';
import next from '@next/eslint-plugin-next';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const sourceFiles = ['**/*.{js,mjs,cjs,jsx,ts,mts,cts,tsx}'];

const ignores = [
    '**/.next/**',
    '**/.turbo/**',
    '**/coverage/**',
    '**/dist/**',
    '**/node_modules/**',
    '**/out/**',
    '**/.vitepress/cache/**',
    '**/.vitepress/dist/**',
    '**/.vitepress/.temp/**',
    'launcher/**',
    'apps/webpaper/public/models/**',
    'apps/webtools/public/ffmpeg/**',
];

/**
 * Architectural dependency rules are intentionally based on stable package
 * entry points. Add new package-level directions here as packages are split.
 */
const packageBoundaries = {
    'no-restricted-imports': ['error', {
        patterns: [
            {
                group: ['@webtools/*/src/**'],
                message: 'Import another package through its public exports.',
            },
            {
                group: ['../../packages/**', '../../../packages/**'],
                message: 'Use the workspace package name instead of a relative cross-package import.',
            },
        ],
    }],
};

export default tseslint.config(
    { ignores },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: sourceFiles,
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.node,
            },
        },
        rules: {
            ...packageBoundaries,
            'no-undef': 'off',
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/no-unused-vars': ['error', {
                argsIgnorePattern: '^_',
                caughtErrorsIgnorePattern: '^_',
                varsIgnorePattern: '^_',
            }],
        },
    },
    {
        files: ['**/*.{jsx,tsx}'],
        plugins: {
            react,
            'react-hooks': reactHooks,
        },
        settings: {
            react: { version: 'detect' },
        },
        rules: {
            ...react.configs.recommended.rules,
            ...react.configs['jsx-runtime'].rules,
            ...reactHooks.configs.flat['recommended-latest'].rules,
            'react/prop-types': 'off',
            // The project does not enable React Compiler. Keep correctness
            // rules, but do not impose compiler-optimization constraints.
            'react-hooks/immutability': 'off',
            'react-hooks/preserve-manual-memoization': 'off',
            'react-hooks/refs': 'off',
            'react-hooks/set-state-in-effect': 'off',
        },
    },
    {
        files: [
            'apps/webpaper/**/*.{js,jsx,ts,tsx}',
            'apps/webtools/**/*.{js,jsx,ts,tsx}',
        ],
        plugins: {
            '@next/next': next,
        },
        rules: {
            ...next.configs.recommended.rules,
            ...next.configs['core-web-vitals'].rules,
            '@next/next/no-html-link-for-pages': 'off',
            '@next/next/no-img-element': 'off',
        },
    },
    {
        files: ['**/*.{config,mock,test,spec}.{js,mjs,cjs,jsx,ts,mts,cts,tsx}'],
        rules: {
            '@typescript-eslint/no-explicit-any': 'off',
        },
    },
);
