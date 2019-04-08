declare var global: {
  INTEGRATION_TEST: true | false;
};

export function isTest() {
  return process.env.NODE_ENV === 'test';
}

export function isIntegrationTest() {
  return process.env.NODE_ENV === 'test' && global.INTEGRATION_TEST;
}

export function isDevBuild() {
  return isTest() || process.env.NODE_ENV !== 'production';
}