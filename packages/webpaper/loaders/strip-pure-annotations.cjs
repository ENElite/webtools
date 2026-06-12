// Webpack loader: strip @__PURE__ annotations from l2d module.
// The l2d library marks its WASM initialization IIFE as pure,
// causing webpack to tree-shake it away. But that IIFE sets
// window.Live2DCubismCore which is needed by the rest of the module.

module.exports = function stripPureAnnotations(source) {
    return source.replace(/\/\*\s*@__PURE__\s*\*\//g, '/* @__KEEP__ */');
};
