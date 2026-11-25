import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SIDEBAR_NAV_GROUPS, filterSidebarGroups } from '../lib/navigation/sidebar';

describe('Sidebar Navigation Categorization Tests', () => {
  it('organizes all core navigation routes into 3 distinct domain categories', () => {
    assert.deepEqual(
      SIDEBAR_NAV_GROUPS.map((g) => g.label),
      ['Overview', 'Identity & Security', 'Platform']
    );

    const overviewHrefs = SIDEBAR_NAV_GROUPS[0].items.map((i) => i.href);
    assert.deepEqual(overviewHrefs, ['/dashboard', '/organization']);

    const identityHrefs = SIDEBAR_NAV_GROUPS[1].items.map((i) => i.href);
    assert.deepEqual(identityHrefs, ['/users', '/roles', '/audit-logs']);

    const platformHrefs = SIDEBAR_NAV_GROUPS[2].items.map((i) => i.href);
    assert.deepEqual(platformHrefs, ['/modules', '/cdn']);
  });

  it('omits categories cleanly when a user lacks permissions for any item in them', () => {
    const basicUserPerms = () => false;
    const groups = filterSidebarGroups(SIDEBAR_NAV_GROUPS, basicUserPerms);

    assert.equal(groups.length, 1);
    assert.equal(groups[0].label, 'Overview');
    assert.deepEqual(groups[0].items.map((i) => i.href), ['/dashboard']);
  });

  it('keeps only permitted items inside partially accessible categories', () => {
    const cdnManagerPerms = (perm: string) => perm === 'cdn.read';
    const groups = filterSidebarGroups(SIDEBAR_NAV_GROUPS, cdnManagerPerms);

    assert.deepEqual(groups.map((g) => g.label), ['Overview', 'Platform']);
    assert.deepEqual(groups[1].items.map((i) => i.href), ['/cdn']);
  });

  it('filters by item label or category label search query cleanly', () => {
    const allPerms = () => true;

    // Searching by item label narrows down to that item's category
    const auditSearch = filterSidebarGroups(SIDEBAR_NAV_GROUPS, allPerms, 'audit');
    assert.equal(auditSearch.length, 1);
    assert.equal(auditSearch[0].label, 'Identity & Security');
    assert.deepEqual(auditSearch[0].items.map((i) => i.href), ['/audit-logs']);

    // Searching by category label keeps all permitted items under that category
    const identityCategorySearch = filterSidebarGroups(SIDEBAR_NAV_GROUPS, allPerms, 'identity');
    assert.equal(identityCategorySearch.length, 1);
    assert.deepEqual(identityCategorySearch[0].items.map((i) => i.href), [
      '/users',
      '/roles',
      '/audit-logs',
    ]);
  });
});
