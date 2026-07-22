# Vendored dependencies (temporary)

## postman-sandbox-6.7.2-per-vu-variables.tgz

**Temporary vendored build — do not keep past upstream release.**

This is a prebuilt tarball of `postman-sandbox` from branch
`feat/per-vu-variables-parallel-iterations`, based on published `6.7.2` plus
commit `75d4caf` ("feat(pmapi): render cycles -1 sentinel as
pm.info.iterationCount: Infinity"). It is packaged under the distinguishing
version `6.7.2-per-vu.0` so npm does not confuse or dedupe it with the
published `postman-sandbox@6.7.2`.

The change makes the sandbox render the `cursor.cycles === -1` wire sentinel
(sent by this runtime under `customParallelIterations` mode) as
`pm.info.iterationCount === Infinity` instead of leaking `-1` / a raw large
number to scripts. It ships inside the built `.cache/bootcode.js` bundle (the
sandbox executes scripts from that prebuilt bundle, not from `lib/` source),
which is why the tarball was produced with the cache/bundle build step run
first.

### How it was built

1. Copied the sandbox worktree (`feat/per-vu-variables-parallel-iterations`,
   HEAD `75d4caf`) to a temp dir — the source worktree was NOT mutated.
2. `npm version 6.7.2-per-vu.0 --no-git-tag-version` in the temp copy.
3. `npm run cache` to regenerate `.cache/bootcode.js` / `.cache/bootcode.browser.js`
   from `lib/` (this is the bundle the VM actually runs).
4. `npm pack` — the resulting tarball includes `.cache/*.js` with the transform
   (`iterationCount:-1===e.cursor.cycles?1/0:...`, where `1/0` === `Infinity`).

### TODO / removal

Once the sandbox change ships upstream in a published `postman-sandbox`
release, re-point `package.json`'s `postman-sandbox` dependency from
`file:vendor/postman-sandbox-6.7.2-per-vu-variables.tgz` back to the published
semver range, run `npm install`, and delete this vendored tarball.
