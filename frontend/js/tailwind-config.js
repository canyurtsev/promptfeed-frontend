/**
 * Global Tailwind Configuration
 */
tailwind.config = {
    darkMode: "class",
    theme: {
        extend: {
            "colors": {
                "surface-container-highest": "#323538",
                "on-surface-variant": "#bfc7d5",
                "background": "#111417",
                "surface-container-low": "#191c1f",
                "surface-container": "#1d2023",
                "on-surface": "#e1e2e6",
                "surface": "#111417",
                "outline-variant": "#404753",
                "primary": "#a2c9ff",
            },
            "borderRadius": { "DEFAULT": "0.125rem", "lg": "0.25rem" }
        },
    },
};
