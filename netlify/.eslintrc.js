module.exports = {
  root: true,
  env: {
    es6: true, // Enable ES6 globals
    node: true, // Enable Node.js global variables and Node.js scoping.
    es2021: true, // Enable ES2021 features
  },
  extends: [
    "eslint:recommended", // Use ESLint's recommended rules
    "google", // Use Google's style guide (optional, but common)
  ],
  parserOptions: {
    ecmaVersion: 2021, // Allow modern ECMAScript syntax
    sourceType: "module", // Use module syntax (import/export) if needed, though index.js uses require
  },
  rules: {
    "quotes": ["error", "double"], // Enforce double quotes
    "indent": ["error", 2], // Enforce 2-space indentation
    "object-curly-spacing": ["error", "never"], // No space inside braces {like: this}
    "require-jsdoc": "off", // Disable requirement for JSDoc comments
    "valid-jsdoc": "off", // Disable validation of JSDoc comments
    "max-len": ["warn", {"code": 120}], // Warn if lines are too long
    // --- Add specific rules to allow certain syntax if needed ---
    // Example: If you have issues with specific syntax, rules can be added here
    // "arrow-parens": ["error", "as-needed"], // Example rule adjustment
  },
  ignorePatterns: [
    "/lib/**/*", // Ignore built files.
    "/node_modules/**/*", // Ignore node_modules
  ],
};

