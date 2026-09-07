# app-sdk — offline Oqto App SDK store

Versioned, extracted `@byteowlz/oqto-app-sdk` packages. `oqto-usermgr`
provisions this directory to `~/.local/share/oqto/app-sdk/` for every user, and
the SDK's `oqto-app-init` scaffold resolves the newest version here
(`$OQTO_APP_SDK_HOME`) so App builds never need network egress.

Layout:

```
app-sdk/
  <semver>/          # extracted npm pack output of one SDK release
```

Update procedure: bump the SDK in its own repo, `pnpm pack`, extract the
tarball into a new `<semver>/` directory here, commit. Keep old versions until
no App package.json references them.
