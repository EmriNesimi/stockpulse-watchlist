import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import jsxA11y from "eslint-plugin-jsx-a11y";

// The two rules that earn their keep here:
//   - react-hooks/exhaustive-deps, because this codebase has several
//     deliberate eslint-disable comments on effect dependency arrays, and
//     without the rule running those comments were unchecked claims. One of
//     them turned out to be factually wrong.
//   - jsx-a11y, because the UI is hand-rolled (no component library) and an
//     unlabelled control is easy to ship and hard to notice.
export default tseslint.config(
  { linterOptions: { reportUnusedDisableDirectives: "error" } },
  { ignores: ["dist/**", "coverage/**", "node_modules/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      globals: { ...globals.browser },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: {
      "react-hooks": reactHooks,
      "jsx-a11y": jsxA11y,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.flatConfigs.recommended.rules,
      // Unused args prefixed with _ are intentional (Express handlers, destructured rest).
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      // Downgraded, not disabled. This rule (new in react-hooks 7) flags any
      // synchronous setState inside an effect. Some of what it catches here is
      // genuinely improvable, but it also flags the standard "set loading true,
      // then fetch" shape in useHistory, which is correct as written. Kept
      // visible as a warning so new instances get looked at, rather than
      // silenced or worked around with a contorted refactor.
      "react-hooks/set-state-in-effect": "warn",
      // A scrollable container has to be focusable or keyboard users can't pan
      // it (WCAG 2.1.1), and the correct wrapper role for one is "region".
      // The rule doesn't know about that pairing, so allow tabIndex there -
      // it still flags tabIndex on genuinely non-interactive, non-scrollable
      // elements, which is what it's for.
      "jsx-a11y/no-noninteractive-tabindex": ["error", { tags: [], roles: ["region"], allowExpressionValues: true }],
      // Reporting unused disable comments is the whole reason for adding this
      // config: a stale one silently turns a rule off forever.
      "no-unused-private-class-members": "error",
    },
  },
  {
    files: ["**/*.test.{ts,tsx}", "src/test/**"],
    languageOptions: { globals: { ...globals.node } },
  }
);
