// scratch/test_verification_api.js
const assert = require('assert');
const path = require('path');
const verificationUtils = require('../src/utils/verification');

async function runTests() {
  console.log('🧪 Starting Verification System Integration Tests...');

  const testGuildId = 'test_guild_' + Date.now();
  const testUserId = 'test_user_' + Date.now();

  // Test 1: Get default/unset config
  const initialConfig = await verificationUtils.getVerificationConfig(testGuildId);
  console.log('✅ Test 1: Unset config returned:', initialConfig === undefined ? 'undefined (clean)' : initialConfig);

  // Test 2: Save custom verification config
  const customConfig = {
    channel_id: '123456789012345678',
    role_id: '987654321098765432',
    unverified_role_id: '112233445566778899',
    log_channel_id: '998877665544332211',
    embed_title: '🛡️ Cyber Security Gate',
    embed_message: 'Welcome to **{server}**! Click verify to unlock channels.',
    embed_color: '#f43f5e',
    embed_image: 'https://example.com/banner.png',
    embed_footer: 'Protected by Uranium Bot',
    type: 'otp',
    button_label: 'Start 2FA Verification',
    button_style: 'Primary',
    button_emoji: '🔐',
    send_dm: true,
    dm_message: 'Congratulations {user}, you are verified in {server}!',
    enabled: true
  };

  await verificationUtils.saveVerificationConfig(testGuildId, customConfig);
  console.log('✅ Test 2: Custom verification config saved successfully.');

  // Test 3: Retrieve saved config and verify fields
  const retrieved = await verificationUtils.getVerificationConfig(testGuildId);
  assert(retrieved, 'Config should exist');
  assert.strictEqual(retrieved.channel_id, customConfig.channel_id);
  assert.strictEqual(retrieved.role_id, customConfig.role_id);
  assert.strictEqual(retrieved.unverified_role_id, customConfig.unverified_role_id);
  assert.strictEqual(retrieved.log_channel_id, customConfig.log_channel_id);
  assert.strictEqual(retrieved.embed_title, customConfig.embed_title);
  assert.strictEqual(retrieved.embed_color, customConfig.embed_color);
  assert.strictEqual(retrieved.type, 'otp');
  assert.strictEqual(retrieved.button_label, 'Start 2FA Verification');
  assert.strictEqual(retrieved.button_emoji, '🔐');
  assert.strictEqual(retrieved.send_dm, true);
  console.log('✅ Test 3: Retrieved config matches all customized fields.');

  // Test 4: OTP generation & validation
  const otp = verificationUtils.generateOTP();
  assert(typeof otp === 'string' && otp.length === 5, 'OTP should be 5 characters');
  await verificationUtils.setOTPCooldown(testGuildId, testUserId, otp);
  
  const cooldownActive = await verificationUtils.isOTPCooldownActive(testGuildId, testUserId);
  assert.strictEqual(cooldownActive, true, 'Cooldown should be active');

  const invalidValidation = await verificationUtils.validateOTP(testGuildId, testUserId, 'WRONG');
  assert.strictEqual(invalidValidation, false, 'Invalid OTP should fail');

  const validValidation = await verificationUtils.validateOTP(testGuildId, testUserId, otp);
  assert.strictEqual(validValidation, true, 'Valid OTP should succeed');
  console.log('✅ Test 4: OTP generation, cooldown, and validation verified.');

  // Test 5: Member verification tracking
  await verificationUtils.markUserVerified(testGuildId, testUserId);
  const verifiedUser = await verificationUtils.getVerifiedUser(testGuildId, testUserId);
  assert(verifiedUser, 'Verified user record should exist');
  
  const verifiedCount = await verificationUtils.getVerifiedUsersCount(testGuildId);
  assert(verifiedCount >= 1, 'Verified users count should be at least 1');

  await verificationUtils.removeUserVerification(testGuildId, testUserId);
  const unverified = await verificationUtils.getVerifiedUser(testGuildId, testUserId);
  assert(!unverified, 'User should no longer be verified');
  console.log('✅ Test 5: User verification tracking and stats verified.');

  // Cleanup test config
  await verificationUtils.deleteVerificationConfig(testGuildId);
  const afterDelete = await verificationUtils.getVerificationConfig(testGuildId);
  assert(!afterDelete, 'Config should be deleted');
  console.log('✅ Test 6: Config deletion verified.');

  console.log('\n🎉 ALL VERIFICATION INTEGRATION TESTS PASSED SUCCESSFULLY! 🎉\n');
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
