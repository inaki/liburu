export type HeadingItem = {
  id: string;
  label: string;
  level: number;
};

export function makeHeadingId(label: string) {
  return label
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");
}

export function stripInlineMarkdown(value: string) {
  return value
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(\*|_)(.*?)\1/g, "$2")
    .replace(/~~(.*?)~~/g, "$1")
    .replace(/<[^>]+>/g, "")
    .trim();
}

export function withUniqueHeadingIds<T extends { id: string }>(headings: T[]) {
  const seen = new Map<string, number>();

  return headings.map((heading) => {
    const count = seen.get(heading.id) ?? 0;
    seen.set(heading.id, count + 1);

    return {
      ...heading,
      id: count === 0 ? heading.id : `${heading.id}-${count + 1}`
    };
  });
}

export function extractHeadings(content: string): HeadingItem[] {
  const headings = content
    .split("\n")
    .map((line) => /^(#{1,3})\s+(.+)$/.exec(line))
    .filter((match): match is RegExpExecArray => Boolean(match))
    .map((match) => {
      const label = stripInlineMarkdown(match[2].trim().replace(/\s+#+\s*$/, ""));

      return {
        id: makeHeadingId(label),
        label,
        level: match[1].length
      };
    });

  return withUniqueHeadingIds(headings);
}
