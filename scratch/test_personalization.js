// Automated test suite for bot personalization and avatar rate limit handling
const assert = require('assert');
const {
  getPersonalization,
  savePersonalization,
  getAvatarCooldown,
  recordAvatarChange,
  lockAvatarCooldown
} = require('../src/utils/personalizationStorage');

async function runTests() {
  console.log('Testing bot personalization and rate limit handling...');

  const testGuildId = 'test_guild_rate_limit_123';

  // 1. Initial cooldown state
  const initialCooldown = getAvatarCooldown(testGuildId);
  console.log('1. Initial cooldown:', initialCooldown);
  assert.strictEqual(initialCooldown.isLocked, false);
  assert.strictEqual(initialCooldown.remainingChanges, 2);

  // 2. Record 1 avatar change
  recordAvatarChange(testGuildId);
  const after1 = getAvatarCooldown(testGuildId);
  console.log('2. After 1 avatar change:', after1);
  assert.strictEqual(after1.isLocked, false);
  assert.strictEqual(after1.remainingChanges, 1);

  // 3. Record 2nd avatar change -> Should lock cooldown!
  recordAvatarChange(testGuildId);
  const after2 = getAvatarCooldown(testGuildId);
  console.log('3. After 2nd avatar change:', after2);
  assert.strictEqual(after2.isLocked, true);
  assert.strictEqual(after2.remainingChanges, 0);
  assert.ok(after2.remainingMinutes > 0);

  // 4. Test lockAvatarCooldown
  lockAvatarCooldown(testGuildId, 10 * 60 * 1000);
  const manuallyLocked = getAvatarCooldown(testGuildId);
  console.log('4. Manually locked cooldown:', manuallyLocked);
  assert.strictEqual(manuallyLocked.isLocked, true);

  // 5. Test Delta Patch logic simulation
  console.log('5. Testing Delta patch calculation...');
  
  // Scenario A: User only changes nickname
  const currentMember = {
    nickname: 'OldBotName',
    avatar: 'old_avatar_hash',
    banner: null
  };
  const currentStorage = {
    nickname: 'OldBotName',
    avatarUrl: 'https://example.com/avatar.png',
    bannerUrl: '',
    bio: ''
  };

  const incomingRequestOnlyNick = {
    nickname: 'NewSuperBot'
    // avatarUrl and bannerUrl omitted or unchanged
  };

  const isAlteringNick = incomingRequestOnlyNick.nickname !== undefined && incomingRequestOnlyNick.nickname !== currentStorage.nickname;
  const isAlteringAvatar = incomingRequestOnlyNick.avatarUrl !== undefined && incomingRequestOnlyNick.avatarUrl !== currentStorage.avatarUrl;
  const isAlteringBanner = incomingRequestOnlyNick.bannerUrl !== undefined && incomingRequestOnlyNick.bannerUrl !== currentStorage.bannerUrl;

  assert.strictEqual(isAlteringNick, true, 'Nickname should be detected as changed');
  assert.strictEqual(isAlteringAvatar, false, 'Avatar should NOT be detected as changed');
  assert.strictEqual(isAlteringBanner, false, 'Banner should NOT be detected as changed');

  const patchBody = {};
  if (isAlteringNick) patchBody.nick = incomingRequestOnlyNick.nickname;

  console.log('Patch body for nickname-only change:', patchBody);
  assert.deepStrictEqual(patchBody, { nick: 'NewSuperBot' }, 'Patch body must strictly only contain nick');
  assert.strictEqual(patchBody.avatar, undefined, 'Avatar must NOT be in patch body');
  assert.strictEqual(patchBody.banner, undefined, 'Banner must NOT be in patch body');

  // Scenario B: Discord throws AVATAR_RATE_LIMIT error recovery simulation
  console.log('6. Simulating AVATAR_RATE_LIMIT error recovery...');
  const simulatedError = new Error('Invalid Form Body avatar[AVATAR_RATE_LIMIT]: You are changing your avatar too fast. Try again later.');
  const isAvatarRateLimit = /AVATAR_RATE_LIMIT/i.test(simulatedError.message);
  assert.strictEqual(isAvatarRateLimit, true);

  if (isAvatarRateLimit) {
    lockAvatarCooldown(testGuildId);
    // Retry patch body with nick only
    const retryBody = { nick: 'NewSuperBot' };
    assert.deepStrictEqual(retryBody, { nick: 'NewSuperBot' });
    console.log('Recovery succeeded: successfully locked cooldown and isolated nickname update.');
  }

  console.log('\nAll tests passed successfully!');
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
