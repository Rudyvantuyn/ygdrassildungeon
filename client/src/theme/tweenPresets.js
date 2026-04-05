export const tweenPresets = {
    sceneFadeIn(targets) {
        return {
            targets,
            alpha: { from: 0, to: 1 },
            duration: 260,
            ease: "Sine.Out"
        };
    },
    impact(targets) {
        return {
            targets,
            scale: { from: 0.9, to: 1.05 },
            duration: 140,
            yoyo: true,
            ease: "Quad.Out"
        };
    }
};
