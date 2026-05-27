/** Chooses which context id descendants should inherit from the current node. */
export const resolveProvidedContextId = (
  active: boolean,
  contextId: string | null,
  inheritedParentId: string | null,
): string | null => {
  return active ? contextId : inheritedParentId;
};
