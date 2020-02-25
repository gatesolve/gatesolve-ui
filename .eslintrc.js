module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: ["./tsconfig.json"]
  },
  plugins: [
    "@typescript-eslint",
    "eslint-comments",
    "jest",
    "import",
    "prettier",
    "react",
    "react-hooks"
  ],
  extends: [
    "eslint:recommended",
    "airbnb-typescript",
    "airbnb/hooks",
    "plugin:@typescript-eslint/eslint-recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
    "plugin:jest/recommended",
    "plugin:eslint-comments/recommended",
    "plugin:import/recommended",
    "plugin:react/recommended",
    "plugin:prettier/recommended",
    "prettier",
    "prettier/@typescript-eslint",
    "prettier/react"
  ],
  rules: {
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn",
    "prettier/prettier": "error"
  }
};
