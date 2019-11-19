import path from 'path';
import resolveFrom from 'resolve-from';
import parentModule from 'parent-module';
import { defaultBasicLogger } from './logging';

const resolve = (moduleId: string) => {
  try {
    const parent = parentModule(__filename);
    if (!parent) {
      return undefined;
    }
    return resolveFrom(path.dirname(parent), moduleId);
  } catch (error) {
    return undefined;
  }
};

export const clearModule = (moduleId: string) => {
  if (typeof moduleId !== 'string') {
    throw new TypeError(`Expected a \`string\`, got \`${typeof moduleId}\``);
  }

  const filePath = resolve(moduleId);

  if (!filePath) {
    return;
  }

  const logger = defaultBasicLogger();

  logger.log('  Clearing', filePath);

  const cache = require.cache as { [key: string]: NodeModule | undefined };

  const entry = cache[filePath];

  // Delete itself from module parent
  if (entry && entry.parent) {
    const children = entry.parent.children;
    for (let i = children.length - 1; i >= 0; i -= 1) {
      if (children[i].id === filePath) {
        children.splice(i, 1);
      }
    }
  }

  // Delete module from cache
  delete cache[filePath];
};
