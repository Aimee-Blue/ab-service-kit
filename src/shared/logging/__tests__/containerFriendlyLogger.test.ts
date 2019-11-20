import { trimWhitespace, friendlyLogEntry } from '../containerFriendlyLogger';
import { EOL } from 'os';

describe(trimWhitespace.name, () => {
  it('should work', () => {
    expect(trimWhitespace(false)).toBe(false);
    expect(trimWhitespace('')).toBe('');
    expect(trimWhitespace('x  x')).toBe('x  x');
    expect(trimWhitespace('  x  x  ')).toBe('x  x');
    expect(trimWhitespace(` ${EOL} x  x  `)).toBe('x  x');
    expect(trimWhitespace(` ${EOL} x  x ${EOL} `)).toBe('x  x');
    expect(trimWhitespace(` - x  x ${EOL} `)).toBe('- x  x');
  });
});

describe(friendlyLogEntry.name, () => {
  it('should work', () => {
    expect(friendlyLogEntry()).toEqual('[]');
    expect(friendlyLogEntry(undefined)).toEqual('["undefined"]');
    expect(friendlyLogEntry(null)).toEqual('["null"]');
    expect(
      friendlyLogEntry(() => {
        return;
      })
    ).toEqual('["[Function]"]');
    expect(friendlyLogEntry('  x  x  ')).toEqual('["x  x"]');
    const err = new Error();
    expect(friendlyLogEntry(err)).toEqual(
      '[' + JSON.stringify(`${err.stack}`) + ']'
    );
    expect(friendlyLogEntry({ someValue: 1 })).toEqual('["{ someValue: 1 }"]');
    expect(
      friendlyLogEntry({
        value: {
          secondLevel: {
            thirdLevel: [1, 2, 3],
            another: {
              andNotDeeperThanThat: {
                goDeeper: 'Value',
                another: { theDepths: {} },
              },
            },
          },
        },
      })
    ).toEqual(
      '["{ value:\\n   { secondLevel:\\n      { thirdLevel: [ 1, 2, 3 ],\\n        another: { andNotDeeperThanThat: [Object] } } } }"]'
    );
    expect(friendlyLogEntry(false)).toEqual('[false]');
    expect(friendlyLogEntry(123)).toEqual('[123]');
    expect(friendlyLogEntry(null)).toEqual('["null"]');
    expect(friendlyLogEntry('  👍 Works with emojis  ❌  ', EOL)).toEqual(
      '["👍 Works with emojis  ❌"]'
    );
  });
});
