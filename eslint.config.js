import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import prettier from 'eslint-config-prettier'

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'playwright-report', 'test-results', 'supabase/.temp'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': 'warn',
    },
  },
  {
    files: ['supabase/functions/**/*.ts'],
    languageOptions: {
      globals: { ...globals.browser, Deno: 'readonly' },
    },
  },
  {
    // Padrão intencional: componentes de UI (estilo shadcn/ui) exportam suas
    // variantes (cva) junto do componente, e contexts exportam o hook junto
    // do Provider — Fast Refresh continua funcionando na prática (Vite só
    // perde o HMR granular nesses casos), então este alerta não se aplica.
    files: [
      'src/components/ui/**/*.tsx',
      'src/contexts/**/*.tsx',
      'src/pages/account/AccountOrdersPage.tsx',
    ],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
  prettier,
)
