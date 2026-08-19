/* eslint-disable no-console */
const path = require('path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

process.env.TS_NODE_PROJECT = path.join(__dirname, 'tsconfig.dev.json');
require('reflect-metadata');
require('ts-node/register/transpile-only');
require('./register-tsconfig-paths.cjs');

const { ForbiddenException, BadRequestException } = require('@nestjs/common');
const { AccessControlService } = require('./src/common/access-control.service.ts');
const { AuthService } = require('./src/auth/auth.services.ts');
const {
  hashPasswordSecure,
  verifyPasswordSecure,
} = require('./src/common/security/password-security.ts');

function valuesFromWhere(value) {
  if (value && typeof value === 'object') {
    const raw = value._value ?? value.value;
    const list = Array.isArray(raw) ? raw : [raw];
    return list.map(Number).filter(Number.isFinite);
  }
  const number = Number(value);
  return Number.isFinite(number) ? [number] : [];
}

function makeAccessControl() {
  const projects = [
    { id: 1, compte: 10, actif: true },
    { id: 2, compte: 20, actif: true },
  ];
  const persons = [
    { id: 101, compte: 30, first_name: 'A', last_name: 'One' },
    { id: 202, compte: 40, first_name: 'B', last_name: 'Two' },
    { id: 303, compte: 50, first_name: 'Coach', last_name: 'Three' },
  ];
  const links = [
    { login_id: 30, project_id: 1 },
    { login_id: 40, project_id: 2 },
    { login_id: 50, project_id: 1 },
  ];
  const professors = [
    { id: 303, project_id: 1 },
  ];

  const ds = {
    getRepository(entity) {
      const name = entity?.name;

      if (name === 'ProjectEntity') {
        return {
          async findOne({ where }) {
            return projects.find((item) => Number(item.id) === Number(where.id)) ?? null;
          },
        };
      }

      if (name === 'PersonneEntity') {
        return {
          async find({ where }) {
            if (where?.id !== undefined) {
              const ids = valuesFromWhere(where.id);
              return persons.filter((item) => ids.includes(Number(item.id)));
            }
            if (where?.compte !== undefined) {
              return persons.filter(
                (item) => Number(item.compte) === Number(where.compte),
              );
            }
            return [...persons];
          },
        };
      }

      if (name === 'LoginProjectEntity') {
        return {
          async exist({ where }) {
            return links.some((item) =>
              Number(item.login_id) === Number(where.login_id) &&
              Number(item.project_id) === Number(where.project_id),
            );
          },
          async find({ where }) {
            const loginIds = valuesFromWhere(where.login_id);
            return links.filter((item) =>
              loginIds.includes(Number(item.login_id)) &&
              Number(item.project_id) === Number(where.project_id),
            );
          },
        };
      }

      if (name === 'ProfesseurEntity') {
        return {
          async exist({ where }) {
            const personIds = valuesFromWhere(where.id);
            return professors.some((item) =>
              personIds.includes(Number(item.id)) &&
              Number(item.project_id) === Number(where.project_id),
            );
          },
        };
      }

      throw new Error(`Unexpected repository ${name}`);
    },
  };

  return new AccessControlService(ds);
}

async function assertRejectsWith(promise, ErrorType, label) {
  let thrown = null;
  try {
    await promise;
  } catch (error) {
    thrown = error;
  }
  assert.ok(thrown instanceof ErrorType, `${label}: expected ${ErrorType.name}`);
}

async function testTenantAuthorization() {
  const access = makeAccessControl();

  const own = await access.getAuthorizedPerson(30, 101, null);
  assert.equal(own.id, 101);

  const projectOne = await access.getAuthorizedPerson(10, 101, 1);
  assert.equal(projectOne.id, 101);

  await assertRejectsWith(
    access.getAuthorizedPerson(10, 202, 1),
    ForbiddenException,
    'cross-project person access',
  );

  const projectTwo = await access.getAuthorizedPerson(20, 202, 2);
  assert.equal(projectTwo.id, 202);

  const memberProject = await access.assertProjectAccess(30, 1);
  assert.equal(memberProject.id, 1, 'a linked member must keep project access');

  await assertRejectsWith(
    access.assertProjectStaff(30, 1),
    ForbiddenException,
    'ordinary member must not become project staff',
  );

  const professorProject = await access.assertProjectStaff(50, 1);
  assert.equal(professorProject.id, 1, 'a professor must keep staff access');

  const adminProject = await access.assertProjectStaff(10, 1);
  assert.equal(adminProject.id, 1, 'project owner must keep staff/admin access');

  const staffPerson = await access.getPersonSelfOrStaff(50, 101, 1);
  assert.equal(staffPerson.person.id, 101);
  assert.equal(staffPerson.isStaff, true);

  await assertRejectsWith(
    access.getPersonSelfOrStaff(30, 303, 1),
    ForbiddenException,
    'ordinary member must not read another member through staff path',
  );
}

async function testResetTokenGate() {
  const rawToken = 'valid-reset-token';
  const expectedHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const account = {
    id: 77,
    login: 'member@example.test',
    actif: true,
    password: 'unchanged',
    activation_token: `v2:${Date.now() + 60_000}:${expectedHash}`,
  };

  let saveCount = 0;
  const compteRepo = {
    async findOne() {
      return account;
    },
    async save(value) {
      saveCount += 1;
      return value;
    },
  };

  const service = new AuthService(
    { sign: () => 'unused' },
    { get: (key) => (key === 'PEPPER' ? 'legacy-pepper' : undefined) },
    { sendPasswordReset: async () => undefined },
    compteRepo,
    { exist: async () => false },
    {},
    {},
    { find: async () => [] },
  );

  await assertRejectsWith(
    service.setPasswordWithToken(account.login, 'wrong-token', 'Password1'),
    BadRequestException,
    'invalid reset token',
  );
  assert.equal(saveCount, 0, 'invalid reset token must not save the account');
  assert.equal(account.password, 'unchanged', 'invalid reset token must not mutate password');

  const ok = await service.setPasswordWithToken(account.login, rawToken, 'Password1');
  assert.equal(ok, true);
  assert.equal(saveCount, 1);
  assert.match(account.password, /^scrypt\$/);
  assert.equal(account.activation_token, null, 'reset token must be single-use');
}

async function testPasswordStorage() {
  const password = 'VerySafePassword1';
  const currentHash = await hashPasswordSecure(password);
  assert.match(currentHash, /^scrypt\$/);

  const currentVerification = await verifyPasswordSecure(password, currentHash, 'unused');
  assert.equal(currentVerification.valid, true);
  assert.equal(currentVerification.needsRehash, false);

  const pepper = 'legacy-pepper';
  const legacyHash = crypto.createHmac('sha256', pepper).update(password).digest('hex');
  const legacyVerification = await verifyPasswordSecure(password, legacyHash, pepper);
  assert.equal(legacyVerification.valid, true);
  assert.equal(legacyVerification.needsRehash, true);

  const wrongVerification = await verifyPasswordSecure('wrong', currentHash, pepper);
  assert.equal(wrongVerification.valid, false);
}

async function main() {
  await testTenantAuthorization();
  await testResetTokenGate();
  await testPasswordStorage();
  console.log('✔ security regression checks passed');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
