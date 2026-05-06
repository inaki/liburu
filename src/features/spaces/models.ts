export type SpaceKind = "local" | "git";

export type Space = {
  id: string;
  name: string;
  kind: SpaceKind;
  localPath: string;
  lastOpenedAt: string;
  lastIndexedAt?: string;
};

export type WorkspaceState = {
  spaces: Space[];
  activeSpaceId: string | null;
};
