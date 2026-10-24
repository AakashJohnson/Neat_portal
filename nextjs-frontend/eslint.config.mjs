import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';

const eslintConfig = defineConfig([
  ...nextVitals,
  {
    rules: {
      // The legacy theme CSS targets plain <img>; next/image would change markup and sizing.
      '@next/next/no-img-element': 'off',
      // Ported markup keeps the original's <img> attributes (many have no alt);
      // missing alt text is tracked as an accessibility item in the reports.
      'jsx-a11y/alt-text': 'off',
    },
  },
  globalIgnores(['.next/**', 'out/**', 'build/**', 'public/**', 'vendor/**', '.scratch/**']),
]);

export default eslintConfig;
