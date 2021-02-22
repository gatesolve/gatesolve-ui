module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: ["./tsconfig.json"],
  },
  plugins: [
    "@typescript-eslint",
    "eslint-comments",
    "jest",
    "import",
    "prettier",
    "react",
    "react-hooks",
  ],
  extends: [
    "react-app",
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
    "plugin:jsx-a11y/recommended",
    "plugin:prettier/recommended",
    "prettier",
  ],
  rules: {
    "react/prop-types": "off",
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn",
    "prettier/prettier": "error",
    "@typescript-eslint/dot-notation": "off",
    // XXX: Enable these new rules as time permits
    "@typescript-eslint/restrict-template-expressions": "off",
    "@typescript-eslint/no-unsafe-assignment": "off",
    "@typescript-eslint/no-unsafe-call": "off",
    "@typescript-eslint/no-unsafe-member-access": "off",
  },
  settings: {
    "import/resolver": {
      // use <root>/tsconfig.json
      typescript: {
        alwaysTryTypes: true, // always try to resolve types under `<root>@types` directory even it doesn't contain any source code, like `@types/unist`
      },
    },
  },
};
