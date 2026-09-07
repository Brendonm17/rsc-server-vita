// trace switch: on for a -DRSC_DIAG client build, or with RSC_DIAG=1 set
function on() {
    if (globalThis.__spDiag === true) {
        return true;
    }

    return (
        typeof process !== 'undefined' &&
        !!process.env &&
        process.env.RSC_DIAG === '1'
    );
}

module.exports = { on };
