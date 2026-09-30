# CMS editing and deployment checks

Content managed by Pages CMS is editorial data, not a test fixture. Tests must
not require a named member, a fixed roster size, exactly twenty researchers,
a particular news slug/date/body, a specific crop, or a permanently enabled
publishing, recommendation, visibility, or carousel flag.

## Coverage

- News: real Jekyll builds render the production carousel and card templates
  with isolated stories. Tests cover publishing/unpublishing, carousel on/off,
  ordering, adding/renaming/deleting, empty lists, edited titles, YAML date
  serialization, photo framing, and uncropped publication figures.
- Software and external resources: independent fixtures cover visibility,
  recommendations, edits, category changes, additions, removals and empty lists.
- Team: independent members cover student/alumni labels, graduation years,
  biographies, names, crop changes/defaults and deletions.
- Publications: fixture-based merge tests cover edits, author flags, hiding,
  deletions and preservation of CMS edits during imports.
- `tests/cms-edit-compatibility.test.mjs` reruns the website checks in temporary
  copies after bulk CMS edits and after clearing all editable lists. It never
  changes the real content. This guards against reintroducing snapshot-based
  editorial assertions.

## Checks that should still fail

Missing referenced images, invalid field types, unsafe URLs, invalid crop
coordinates, unknown region codes, and accidental private fields remain
errors. Rendering, escaping, accessibility and scientific dataset integrity
checks are not disabled to make a deployment pass.

Run `node --test tests/*.test.mjs`, all `tests/*_test.rb` with `bundle exec ruby`,
`npm test --prefix atlas`, and `node scripts/build.mjs` before publishing.
Review editorial facts and image provenance separately; do not encode them as
permanent requirements on individual live CMS records.
