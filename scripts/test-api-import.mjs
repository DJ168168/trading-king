import('/home/ubuntu/repo_git/api/index.ts')
  .then((mod) => {
    console.log('IMPORT_OK', typeof mod.default);
    process.exit(0);
  })
  .catch((err) => {
    console.error('IMPORT_FAIL');
    console.error(err && err.stack ? err.stack : err);
    process.exit(1);
  });
