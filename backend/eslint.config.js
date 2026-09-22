import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'drizzle'] },
  ...tseslint.configs.recommended,
  {
    rules: {
      // Express identifies error handlers by arity, so unused `_next` params must stay.
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
);
