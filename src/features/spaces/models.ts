export type SpaceKind = "local" | "git";

export type Space = {
  id: string;
  name: string;
  displayName?: string;
  kind: SpaceKind;
  localPath: string;
  excludePaths: string[];
  lastOpenedAt: string;
  lastIndexedAt?: string;
};

export type WorkspaceState = {
  spaces: Space[];
  activeSpaceId: string | null;
};
