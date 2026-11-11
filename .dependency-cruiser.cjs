module.exports = {
  forbidden: [
    { name: 'no-circular', severity: 'error', from: {}, to: { circular: true } },
    { name: 'no-unresolvable', severity: 'error', from: {}, to: { couldNotResolve: true } },
    {
      name: 'no-runtime-npm',
      severity: 'error',
      comment: 'app code uses no npm packages',
      from: { path: '^(server|web)/' },
      to: {
        dependencyTypes: [
          'npm',
          'npm-dev',
          'npm-optional',
          'npm-peer',
          'npm-no-pkg',
          'npm-unknown',
        ],
      },
    },
    {
      name: 'web-no-node-builtins',
      severity: 'error',
      from: { path: '^web/' },
      to: { dependencyTypes: ['core'] },
    },
    {
      name: 'web-server-separate',
      severity: 'error',
      from: { path: '^web/' },
      to: { path: '^server/' },
    },
    {
      name: 'server-web-separate',
      severity: 'error',
      from: { path: '^server/' },
      to: { path: '^web/' },
    },
    {
      name: 'core-is-pure',
      severity: 'error',
      from: { path: '^web/js/core/' },
      to: { path: '^web/js/(store|persistence|ui)/|^web/js/main\\.js$' },
    },
    {
      name: 'recipe-model-is-base',
      severity: 'error',
      from: { path: '^web/js/core/recipe/' },
      to: { path: '^web/js/core/(scaling|search)/' },
    },
    {
      name: 'store-not-ui-or-impl',
      severity: 'error',
      from: { path: '^web/js/store/' },
      to: { path: '^web/js/(ui|persistence)/|^web/js/main\\.js$' },
    },
    {
      name: 'persistence-only-ports',
      severity: 'error',
      from: { path: '^web/js/persistence/' },
      to: {
        path: '^web/js/(ui|store|core/(scaling|search))/|^web/js/main\\.js$',
        pathNot: '^web/js/store/(ports|errors)\\.js$',
      },
    },
    {
      name: 'ui-not-persistence',
      severity: 'error',
      from: { path: '^web/js/ui/' },
      to: { path: '^web/js/persistence/|^web/js/main\\.js$' },
    },
  ],
  options: { doNotFollow: { path: 'node_modules' }, moduleSystems: ['es6'] },
};
