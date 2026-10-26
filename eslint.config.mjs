import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';

const eslintConfig = defineConfig([
  ...nextVitals,
  {
    rules: {

      '@next/next/no-img-element': 'off',


      'jsx-a11y/alt-text': 'off',
    },
  },
  globalIgnores(['.next/**', 'out/**', 'build/**', 'public/**', 'vendor/**', '.scratch/**']),
]);

export default eslintConfig;
