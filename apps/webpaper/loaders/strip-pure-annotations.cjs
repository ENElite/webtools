// l2d's bundled Cubism bootstrap has a PURE annotation even though it installs
// window.Live2DCubismCore as a required side effect. Preserve it in Webpack builds.
module.exports = function stripPureAnnotations(source) {
    return source.replace(/\/\*\s*@__PURE__\s*\*\//g, '/* @__KEEP__ */');
};
