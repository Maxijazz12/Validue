/**
 * Shared motion constants — mirrors CSS custom properties in globals.css.
 * Use these in JS when you need programmatic access to timing values.
 */

export const EASE_SPRING = "cubic-bezier(0.16, 1, 0.3, 1)";
export const EASE_STANDARD = "cubic-bezier(0.4, 0, 0.2, 1)";
export const EASE_OUT = "cubic-bezier(0, 0, 0.2, 1)";

export const DURATION_ENTER = 500; // ms
export const DURATION_EXIT = 250;
export const DURATION_SLOW = 700;
export const STAGGER_CHILD = 60; // ms between staggered children
