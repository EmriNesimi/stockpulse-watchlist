import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

// Narrower than the frontend config - no React here, so this is about catching
// unused code, accidental `any`, and floating promises in route handlers.
export default tseslint.config(
  { linterOptions: { reportUnusedDisableDirectives: "error" } },
  { ignores: ["dist/**", "node_modules/**", "prisma/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.ts"],
    languageOptions: { globals: { ...globals.node } },
    rules: {
      // Express error middleware needs a 4th arg it never reads, and several
      // handlers destructure a rest object off something they discard.
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      // Augmenting Express's Request type (to add req.userId) can only be done
      // through declaration merging into its namespace - there's no other
      // syntax for it. The rule is still on for namespaces used as a module
      // system, which is the pattern it actually exists to discourage.
      "@typescript-eslint/no-namespace": ["error", { allowDeclarations: true }],
    },
  }
);
