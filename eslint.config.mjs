import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import prettier from "eslint-config-prettier";

export default [
  {
    files: ["**/*.ts", "**/*.tsx"],
    ignores: ["**/dist/**", "**/node_modules/**"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        projectService: true
      }
    },
    plugins: {
      "@typescript-eslint": tsPlugin
    },
    rules: {
      ...tsPlugin.configs["recommended-type-checked"].rules,
      "@typescript-eslint/no-floating-promises": "error"
    }
  },
  prettier
];
