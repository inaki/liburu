import type { Space, WorkspaceState } from "./models";

export const WORKSPACE_KEY = "md-project-viewer:workspace";
const LEGACY_RECENT_ROOTS_KEY = "md-project-viewer:recent-roots";
export const DEFAULT_SPACE_EXCLUDES = [
  ".git",
  "node_modules",
  "dist",
  "build",
  "target",
  ".next",
  "coverage"
];

function createSpaceId(path: string) {
  return `space:${path}`;
}

function getSpaceName(path: string) {
  const parts = path.split(/[\\/]/).filter(Boolean);
  return parts[parts.length - 1] ?? path;
}

export function getSpaceLabel(space: Space) {
  return space.displayName?.trim() || space.name;
}

export function normalizeExcludePaths(values: string[] | undefined) {
  const cleaned = (values ?? [])
    .map((value) => value.trim().replace(/\\/g, "/"))
    .filter(Boolean)
    .filter((value, index, all) => all.indexOf(value) === index);

  return cleaned.length > 0 ? cleaned : [...DEFAULT_SPACE_EXCLUDES];
}

function isWorkspaceState(value: unknown): value is WorkspaceState {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as WorkspaceState;
  return Array.isArray(candidate.spaces) && "activeSpaceId" in candidate;
}

export function createSpace(path: string, indexedAt?: string): Space {
  return {
    id: createSpaceId(path),
    name: getSpaceName(path),
    kind: "local",
    localPath: path,
    excludePaths: [...DEFAULT_SPACE_EXCLUDES],
    lastOpenedAt: new Date().toISOString(),
    lastIndexedAt: indexedAt
  };
}

function hydrateSpace(space: Space): Space {
  return {
    ...space,
    excludePaths: normalizeExcludePaths(space.excludePaths)
  };
}

export function readWorkspaceState(): WorkspaceState {
  const stored = window.localStorage.getItem(WORKSPACE_KEY);

  if (stored) {
    try {
      const parsed = JSON.parse(stored) as unknown;
      if (isWorkspaceState(parsed)) {
        return {
          ...parsed,
          spaces: parsed.spaces.map((space) => hydrateSpace(space))
        };
      }
    } catch {
      window.localStorage.removeItem(WORKSPACE_KEY);
    }
  }

  const legacyRecentRoots = window.localStorage.getItem(LEGACY_RECENT_ROOTS_KEY);
  if (legacyRecentRoots) {
    try {
      const parsed = JSON.parse(legacyRecentRoots) as string[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        const spaces = parsed.map((path) => createSpace(path));
        return {
          spaces,
          activeSpaceId: spaces[0]?.id ?? null
        };
      }
    } catch {
      window.localStorage.removeItem(LEGACY_RECENT_ROOTS_KEY);
    }
  }

  return {
    spaces: [],
    activeSpaceId: null
  };
}

export function writeWorkspaceState(state: WorkspaceState) {
  window.localStorage.setItem(WORKSPACE_KEY, JSON.stringify(state));
}
