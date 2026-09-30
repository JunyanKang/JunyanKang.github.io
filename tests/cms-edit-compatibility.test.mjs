import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = fileURLToPath(new URL('../', import.meta.url));

test('all website checks permit CMS edits and empty lists without touching real content', { timeout: 120000 }, async () => {
  const sandbox = await mkdtemp(join(tmpdir(), 'kanglab-cms-compatibility-'));
  const env = { ...process.env, BUNDLE_GEMFILE: join(root, 'Gemfile') };
  delete env.NODE_TEST_CONTEXT;
  const run = (command, args) => {
    const result = spawnSync(command, args, { cwd: sandbox, env, encoding: 'utf8', timeout: 45000 });
    assert.equal(result.status, 0, `${command} ${args.join(' ')}\n${result.error || ''}\n${result.stdout}\n${result.stderr}`);
  };
  try {
    // Copy editable inputs and tests; other files are read-only references.
    for (const path of ['tests', '_data', '_news']) await cp(join(root, path), join(sandbox, path), { recursive: true });
    for (const path of ['assets', 'atlas', 'scripts', '_includes', '_layouts', '_pages', '_plugins', '.pages.yml', '_config.yml', 'Gemfile', 'Gemfile.lock']) {
      await symlink(join(root, path), join(sandbox, path));
    }
    const files = await readdir(join(sandbox, 'tests'));
    const nodeTests = files.filter(name => name.endsWith('.test.mjs') && name !== 'cms-edit-compatibility.test.mjs').map(name => `tests/${name}`);
    const rubyTests = files.filter(name => name.endsWith('_test.rb'));
    const verify = () => {
      run(process.execPath, ['--test', ...nodeTests]);
      for (const name of rubyTests) run('bundle', ['exec', 'ruby', `tests/${name}`]);
    };
    const save = (path, data) => writeFile(join(sandbox, path), JSON.stringify(data));
    const load = async path => JSON.parse(await readFile(join(sandbox, path), 'utf8'));

    const team = await load('_data/team.json');
    team.members = team.members.slice(0, 2).map((member, index) => ({
      ...member, name: `Edited member ${index}`, group: 'alumni', role: 'PhD graduate',
      year: 2020, graduation_year: 2025, photo: null, photo_center_x: null, photo_scale: null,
      hometown: 'Updated hometown', bio: 'Updated biography',
    }));
    await save('_data/team.json', team);
    const publications = await load('_data/publications_manual.json');
    publications.items = publications.items.slice(0, 1).map(paper => ({ ...paper, hidden: true, selected: false, preview: null }));
    await save('_data/publications_manual.json', publications);
    // JSON is valid YAML: this also exercises serialization-independent checks.
    await save('_data/software.yml', { groups: [{ id: 'imaging', title: 'Edited group' }], projects: [{ title: 'Edited software', group: 'imaging', visible: false }] });
    await save('_data/external_resources.yml', { groups: [{ id: 'labs', title: 'Edited labs' }], items: [{ title: 'Edited researcher', visible: false }] });
    const stories = await readdir(join(sandbox, '_news'));
    for (const name of stories) if (name.endsWith('.md')) {
      const path = join(sandbox, '_news', name);
      await writeFile(path, (await readFile(path, 'utf8')).replace(/^show_in_hero:.*$/m, 'show_in_hero: false'));
    }
    verify();

    await save('_data/team.json', { ...team, members: [] });
    await save('_data/publications_manual.json', { ...publications, items: [] });
    await save('_data/software.yml', { groups: [], projects: [] });
    await save('_data/external_resources.yml', { groups: [], items: [] });
    for (const name of stories) if (name.endsWith('.md')) await rm(join(sandbox, '_news', name));
    verify();
  } finally {
    await rm(sandbox, { recursive: true, force: true });
  }
});
