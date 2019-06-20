declare var global: {
  INTEGRATION_TEST: true | false;
};

export function isUnitTest() {
  return process.env.NODE_ENV === 'test';
}

export function isIntegrationTest() {
  return process.env.NODE_ENV === 'test' && global.INTEGRATION_TEST;
}

export function isDevBuild() {
  return isUnitTest() || process.env.NODE_ENV !== 'production';
}
