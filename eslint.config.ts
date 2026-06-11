import neostandard from 'neostandard';

/** 尾随逗号 */
const commaDangle = (val: any) => {
    if (val?.rules?.['@stylistic/comma-dangle']?.[0] === 'warn') {
        const rule = val?.rules?.['@stylistic/comma-dangle']?.[1];
        Object.keys(rule).forEach(key => {
            rule[key] = 'always-multiline';
        });
        val.rules['@stylistic/comma-dangle'][1] = rule;
    }

    /** 三元表达式 */
    if (val?.rules?.['@stylistic/indent']) {
        val.rules['@stylistic/indent'][1] = 4;
        val.rules['@stylistic/indent'][2] = {
            ...val.rules?.['@stylistic/indent']?.[2],
            flatTernaryExpressions: true,
            offsetTernaryExpressions: false,
        };
    }

    if (val?.rules?.['@stylistic/jsx-indent']) {
        val.rules['@stylistic/jsx-indent'][1] = 4;
    }

    if (val?.rules?.['@stylistic/jsx-indent-props']) {
        val.rules['@stylistic/jsx-indent-props'][1] = 4;
    }

    if (val?.rules) {
        val.rules['@stylistic/space-before-function-paren'] = ['error', 'never'];
        val.rules['@stylistic/multiline-ternary'] = 'off';
    }

    /** 支持下划线 - 禁用 camelcase 规则 */
    if (val?.rules?.camelcase) {
        val.rules.camelcase = 'off';
    }

    /** 未使用的变量强制报错 */
    if (val?.rules?.['@typescript-eslint/no-unused-vars']) {
        val.rules['@typescript-eslint/no-unused-vars'] = ['error', {
            argsIgnorePattern: '^_',
            varsIgnorePattern: '^_',
            caughtErrorsIgnorePattern: '^_',
        }];
    }

    return val;
};

/** 忽略的文件 */
const ignores = [
    'node_modules',
    '**/dist/**',
    'launcher',
];

const options = neostandard({
    ts: true,
    ignores,
    semi: true, // 强制使用分号
}).map(commaDangle);

export default options;
