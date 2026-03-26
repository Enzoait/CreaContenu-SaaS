/**
 * Typage strict : interdit `any` explicite et le mot-clé de type `unknown`.
 * Les règles « type-checked » (no-unsafe-*) ne sont pas activées : elles
 * exigent des typages générés Supabase partout et explosent le bruit sans gain
 * sur les `any` implicites des libs.
 */
module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react-hooks/recommended",
  ],
  ignorePatterns: ["dist", ".eslintrc.cjs"],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    ecmaFeatures: { jsx: true },
  },
  plugins: ["react-refresh", "@typescript-eslint"],
  rules: {
    "react-refresh/only-export-components": [
      "warn",
      { allowConstantExport: true },
    ],
    "@typescript-eslint/no-explicit-any": "error",
    "no-restricted-syntax": [
      "error",
      {
        selector: "TSUnknownKeyword",
        message:
          "Évite le type `unknown` : préfère une union, un type métier (ex. FlatUserMetadata), ou des génériques.",
      },
    ],
  },
};
