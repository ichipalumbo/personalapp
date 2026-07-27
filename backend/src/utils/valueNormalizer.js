function normalizedOrOriginal(value, normalizer) {
  if (value === undefined || value === null) {
    return value;
  }

  const normalized = normalizer(value);
  return normalized || value;
}

module.exports = {
  normalizedOrOriginal
};
