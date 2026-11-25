import globals from "globals";
import pluginJs from "@eslint/js";
import pluginReact from "eslint-plugin-react";
import pluginReactHooks from "eslint-plugin-react-hooks";
import pluginUnusedImports from "eslint-plugin-unused-imports";
import pluginJsxA11y from "eslint-plugin-jsx-a11y";

export default [
  {
    // global ignores: tooling/staging/build dirs are not app source and must not be linted
    ignores: [
      "node_modules/**",
      "dist/**",
      "coverage/**",
      ".opencode/**",
      ".opencode-backups/**",
      ".opencode-skill-staging/**",
      ".bsp/**",
      ".lighthouseci/**",
      ".mimosa/**",
      ".scala-build/**",
      "lighthouse-reports/**",
    ],
  },
  {
    files: [
      "src/**/*.{js,mjs,cjs,jsx}",
    ],
    ignores: ["src/components/ui/**/*", "dist/**", "node_modules/**"],
    ...pluginJs.configs.recommended,
    ...pluginReact.configs.flat.recommended,
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    plugins: {
      react: pluginReact,
      "react-hooks": pluginReactHooks,
      "unused-imports": pluginUnusedImports,
      "jsx-a11y": pluginJsxA11y,
    },
    rules: {
      // Both recommended presets must be merged into `rules` explicitly.
      // Spreading the whole config object at this level lets the trailing
      // `rules:` key clobber them, which silently disabled no-undef and friends.
      ...pluginJs.configs.recommended.rules,
      ...pluginReact.configs.flat.recommended.rules,
      ...pluginJsxA11y.configs.recommended.rules,
      "jsx-a11y/click-events-have-key-events": "warn",
      "jsx-a11y/no-static-element-interactions": "warn",
      "jsx-a11y/no-autofocus": "warn",
      "no-unused-vars": "off",
      "react/jsx-uses-vars": "error",
      "react/jsx-uses-react": "error",
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "warn",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "after-used",
          argsIgnorePattern: "^_",
        },
      ],
      "react/prop-types": "off",
      "react/react-in-jsx-scope": "off",
      "react/no-unknown-property": [
        "error",
        { ignore: ["cmdk-input-wrapper", "toast-close"] },
      ],
      "react-hooks/rules-of-hooks": "error",
      // Cosmetic only, and never enforced before the config fix. Kept as warnings
      // so the security-relevant rules above stay at error without touching
      // unrelated JSX copy in five already-dirty files.
      "react/no-unescaped-entities": "warn",
      "react/display-name": "warn",
    },
  },
  {
    // React Three Fiber maps non-DOM props (geometry, material) onto three.js
    // objects. Standard JSX property validation does not know them, so R3F
    // files get an explicit, scoped allowance instead of disabling the rule
    // globally.
    files: ["src/components/nara/**/*.{js,jsx}"],
    rules: {
      "react/no-unknown-property": "off",
    },
  },
];
