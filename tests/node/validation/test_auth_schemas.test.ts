import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { 
  validateAuthLogin, 
  validateAuthRegister, 
  validateAuthPasswordReset,
  validateTrainerName,
  validateUserProfile
} from '../../../src/logic/validation/schemas.ts';

describe('Auth & User Profiles Strict Validation', () => {
  it('validates correct login credentials', () => {
    const validLogin = {
      email: 'ash@kanto.org',
      password: 'secretPassword123'
    };
    const res = validateAuthLogin(validLogin);
    assert.strictEqual(res.success, true);
  });

  it('rejects invalid email formats in login and register', () => {
    const badLogin = {
      email: 'not-an-email',
      password: 'password123'
    };
    const res = validateAuthLogin(badLogin);
    assert.strictEqual(res.success, false);
  });

  it('rejects passwords shorter than 6 characters', () => {
    const badPass = {
      email: 'valid@kanto.org',
      password: '123'
    };
    const res = validateAuthLogin(badPass);
    assert.strictEqual(res.success, false);
  });

  it('validates a correct user registration payload', () => {
    const validRegister = {
      email: 'misty@cerulean.org',
      password: 'starmieMaster123',
      username: 'Misty_Gym',
      gender: 'm' as const
    };
    const res = validateAuthRegister(validRegister);
    assert.strictEqual(res.success, true);
  });

  it('rejects registration with special characters in username', () => {
    const badUsername = {
      email: 'brock@pewter.org',
      password: 'onixRockSolid1',
      username: 'Brock<script>alert(1)</script>'
    };
    const res = validateAuthRegister(badUsername);
    assert.strictEqual(res.success, false);
  });

  it('validates password reset schema', () => {
    const validReset = {
      password: 'newSecretPassword123',
      confirmPassword: 'newSecretPassword123'
    };
    const res = validateAuthPasswordReset(validReset);
    assert.strictEqual(res.success, true);
  });

  it('validates trainer name with length bounds', () => {
    assert.strictEqual(validateTrainerName('Red').success, true);
    assert.strictEqual(validateTrainerName('A').success, false);
    assert.strictEqual(validateTrainerName('SuperLongTrainerNameExceedingLimit12345').success, false);
  });

  it('validates user profile and rejects negative coins', () => {
    const validProfile = {
      id: 'usr_1',
      username: 'Gary_Oak',
      level: 10,
      is_banned: false,
      coins: 500
    };
    assert.strictEqual(validateUserProfile(validProfile).success, true);

    const badProfile = {
      ...validProfile,
      coins: -100
    };
    assert.strictEqual(validateUserProfile(badProfile).success, false);
  });
});
