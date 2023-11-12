const regexDict: Record<string, RegExp> = {};

function toRegex(path: string) {
  if (!regexDict[path])
    regexDict[path] = new RegExp(
      `^${path
        .split("*")
        .map((k) => k.replace(".", "\\."))
        .join("[^.]*")}$`
    );
  return regexDict[path];
}

export function getWildCardPaths(path: string, keys: string[]) {
  if (keys.includes(path)) return null;

  const matchingWildCards: string[] = [];

  for (const key of keys) {
    if (regexDict[key] && regexDict[key].test(path))
      matchingWildCards.push(key);
    else if (key.includes("*")) {
      regexDict[key] = toRegex(key);
      if (regexDict[key].test(path)) matchingWildCards.push(key);
    }
  }

  if (matchingWildCards.length > 0) return matchingWildCards;

  return null;
}
