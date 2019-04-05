declare module 'clear-module' {
  type ClearFn = (moduleId: string) => void;

  const clear: ClearFn & {
    all();
    match(moduleRegExp: RegExp);
  };

  export default clear;
}
