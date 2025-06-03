// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';
// import eslintConfigPrettier from 'eslint-config-prettier'; // Możemy spróbować to usunąć

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs', 'dist/**/*'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended, // Ta linia powinna załatwić integrację z eslint-config-prettier
  // eslintConfigPrettier, // Usunięte - eslintPluginPrettierRecommended powinno to pokrywać
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      ecmaVersion: 2020,
      sourceType: 'module',
      parserOptions: {
        project: true, // Zmienione z projectService: true dla nowszych wersji typescript-eslint
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      // Reguła prettier/prettier jest już konfigurowana przez eslintPluginPrettierRecommended
      // Jeśli chcesz nadpisać opcje Prettiera specyficznie dla ESLint (co zwykle nie jest konieczne
      // jeśli masz .prettierrc.json), możesz to zrobić tutaj.
      // Na przykład, jeśli .prettierrc.json nie jest brane pod uwagę z jakiegoś powodu:
      // 'prettier/prettier': ['error', { "singleQuote": true, "trailingComma": "all", "endOfLine": "auto" }],
      // Ale najlepiej, aby eslint-plugin-prettier automatycznie używał konfiguracji z .prettierrc.json
    },
  }
);