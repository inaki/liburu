import { useEffect, useState } from "react";
import type { Space, WorkspaceState } from "./models";
import { createSpace, normalizeExcludePaths, readWorkspaceState, writeWorkspaceState } from "./storage";

export function useWorkspace() {
  const [workspace, setWorkspace] = useState<WorkspaceState>({
    spaces: [],
    activeSpaceId: null
  });
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setWorkspace(readWorkspaceState());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    writeWorkspaceState(workspace);
  }, [hydrated, workspace]);

  function upsertSpace(path: string, indexedAt?: string) {
    const nextSpace = createSpace(path, indexedAt);

    setWorkspace((current) => {
      const existing = current.spaces.find((space) => space.id === nextSpace.id);
      const spaces = existing
        ? current.spaces.map((space) =>
            space.id === nextSpace.id
              ? {
                  ...space,
                  name: nextSpace.name,
                  kind: nextSpace.kind,
                  localPath: nextSpace.localPath,
                  excludePaths: normalizeExcludePaths(space.excludePaths),
                  lastOpenedAt: nextSpace.lastOpenedAt,
                  lastIndexedAt: indexedAt ?? space.lastIndexedAt
                }
              : space
          )
        : [nextSpace, ...current.spaces];

      spaces.sort((left, right) => right.lastOpenedAt.localeCompare(left.lastOpenedAt));

      return {
        spaces,
        activeSpaceId: nextSpace.id
      };
    });

    return nextSpace;
  }

  function setActiveSpaceId(spaceId: string) {
    setWorkspace((current) => ({
      spaces: current.spaces.map((space) =>
        space.id === spaceId ? { ...space, lastOpenedAt: new Date().toISOString() } : space
      ),
      activeSpaceId: spaceId
    }));
  }

  function clearWorkspace() {
    setWorkspace({
      spaces: [],
      activeSpaceId: null
    });
  }

  function renameSpace(spaceId: string, displayName: string) {
    setWorkspace((current) => ({
      spaces: current.spaces.map((space) =>
        space.id === spaceId
          ? {
              ...space,
              displayName: displayName.trim() || undefined
            }
          : space
      ),
      activeSpaceId: current.activeSpaceId
    }));
  }

  function togglePinned(spaceId: string) {
    setWorkspace((current) => ({
      spaces: current.spaces.map((space) =>
        space.id === spaceId
          ? {
              ...space,
              isPinned: !space.isPinned
            }
          : space
      ),
      activeSpaceId: current.activeSpaceId
    }));
  }

  function toggleArchived(spaceId: string) {
    setWorkspace((current) => ({
      spaces: current.spaces.map((space) =>
        space.id === spaceId
          ? {
              ...space,
              isArchived: !space.isArchived,
              isPinned: space.isArchived ? space.isPinned : false
            }
          : space
      ),
      activeSpaceId: current.activeSpaceId
    }));
  }

  function moveSpace(spaceId: string, direction: -1 | 1) {
    setWorkspace((current) => {
      const index = current.spaces.findIndex((space) => space.id === spaceId);
      const nextIndex = index + direction;
      if (index === -1 || nextIndex < 0 || nextIndex >= current.spaces.length) {
        return current;
      }

      const spaces = [...current.spaces];
      const [space] = spaces.splice(index, 1);
      spaces.splice(nextIndex, 0, space);

      return {
        spaces,
        activeSpaceId: current.activeSpaceId
      };
    });
  }

  function removeSpace(spaceId: string) {
    setWorkspace((current) => {
      const spaces = current.spaces.filter((space) => space.id !== spaceId);
      return {
        spaces,
        activeSpaceId:
          current.activeSpaceId === spaceId ? (spaces[0]?.id ?? null) : current.activeSpaceId
      };
    });
  }

  function updateSpaceExcludes(spaceId: string, excludePaths: string[]) {
    setWorkspace((current) => ({
      spaces: current.spaces.map((space) =>
        space.id === spaceId
          ? {
              ...space,
              excludePaths: normalizeExcludePaths(excludePaths)
            }
          : space
      ),
      activeSpaceId: current.activeSpaceId
    }));
  }

  const activeSpace: Space | null =
    workspace.spaces.find((space) => space.id === workspace.activeSpaceId) ?? null;

  return {
    hydrated,
    spaces: workspace.spaces,
    activeSpaceId: workspace.activeSpaceId,
    activeSpace,
    upsertSpace,
    setActiveSpaceId,
    renameSpace,
    togglePinned,
    toggleArchived,
    moveSpace,
    updateSpaceExcludes,
    removeSpace,
    clearWorkspace
  };
}
