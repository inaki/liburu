import { useEffect, useState } from "react";
import type { Space, WorkspaceState } from "./models";
import { createSpace, readWorkspaceState, writeWorkspaceState } from "./storage";

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

  const activeSpace: Space | null =
    workspace.spaces.find((space) => space.id === workspace.activeSpaceId) ?? null;

  return {
    hydrated,
    spaces: workspace.spaces,
    activeSpaceId: workspace.activeSpaceId,
    activeSpace,
    upsertSpace,
    setActiveSpaceId,
    clearWorkspace
  };
}
