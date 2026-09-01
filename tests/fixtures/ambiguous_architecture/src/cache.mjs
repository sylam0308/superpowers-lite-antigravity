const values = new Map();

export const cache = {
  get(key) { return values.get(key); },
  set(key, value) { values.set(key, value); },
};
