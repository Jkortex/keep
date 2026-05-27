import type {
  HotkeyContextManager,
  HotkeyContextNode,
  HotkeyContextRegistration,
  HotkeyRuntime,
} from './types';

/**
 * Internal node representation.
 * We simply augment the public HotkeyContextNode with management metadata.
 */
interface ManagedNode extends HotkeyContextNode {
  order: number; // Dynamic recency weight (stack order)
  refCount: number; // For idempotent registration
}

/** Represents a resolved path from root to leaf. */
interface ContextPath {
  readonly ids: string[];
  readonly nodes: HotkeyContextNode[];
}

/**
 * Manages the tree of UI context nodes and identifies the "active" path.
 *
 * Selection Strategy:
 * 1. Path Validity: A path is only valid if all nodes from leaf to root are 'active'.
 * 2. Depth: Deeper paths always win (children override parents).
 * 3. Recency: If depths are equal, the most recently activated node wins.
 */
export function createHotkeyContextManager(
  runtime: Pick<HotkeyRuntime, 'emitChange' | 'getSnapshot' | 'setSnapshot'>,
): HotkeyContextManager {
  const nodes = new Map<string, ManagedNode>();
  let orderCounter = 0;
  let activeContextIds: readonly string[] = [];

  /** Traverses parent chain to build a full path. Returns null if interrupted by inactivity. */
  function resolveActivePath(leaf: ManagedNode): ContextPath | null {
    const ids: string[] = [];
    const pathNodes: HotkeyContextNode[] = [];
    let current: ManagedNode | undefined = leaf;

    while (current) {
      if (current.active === false) return null; // Path is blocked
      ids.push(current.id);

      // Explicitly pick properties to satisfy the HotkeyContextNode interface
      pathNodes.push({
        id: current.id,
        active: current.active,
        parentId: current.parentId,
      });

      current = current.parentId ? nodes.get(current.parentId) : undefined;
    }

    return {
      ids: ids.reverse(),
      nodes: pathNodes.reverse(),
    };
  }

  /** Scans all nodes to identify the best active path and updates the runtime snapshot. */
  function sync(): void {
    let bestDepth = -1;
    let bestOrder = -1;
    let bestPath: ContextPath | null = null;

    for (const managed of nodes.values()) {
      const path = resolveActivePath(managed);
      if (!path) continue;

      const depth = path.nodes.length;
      // Selection: deeper wins; if same depth, more recent (order) wins.
      if (
        depth > bestDepth ||
        (depth === bestDepth && managed.order > bestOrder)
      ) {
        bestDepth = depth;
        bestOrder = managed.order;
        bestPath = path;
      }
    }

    activeContextIds = bestPath?.ids ?? [];

    runtime.setSnapshot({
      ...runtime.getSnapshot(),
      contextPath: bestPath?.nodes ?? [],
    });
    runtime.emitChange();
  }

  /** Updates an existing node's configuration and recalculates the active path. */
  function updateNode(id: string, node: HotkeyContextNode): void {
    const managed = nodes.get(id);
    if (!managed) return;

    // Bump order if the node is transitioning from inactive to active.
    if (managed.active === false && node.active !== false) {
      managed.order = orderCounter++;
    }

    Object.assign(managed, node);
    sync();
  }

  /** Decrements the reference count and removes the node if it reaches zero. */
  function disposeNode(id: string): void {
    const managed = nodes.get(id);
    if (!managed) return;

    managed.refCount--;
    if (managed.refCount <= 0) {
      nodes.delete(id);
    }
    sync();
  }

  /** Registers a context node. Idempotent: multiple calls for the same ID increment refCount. */
  function register(node: HotkeyContextNode): HotkeyContextRegistration {
    const id = node.id;
    let managed = nodes.get(id);

    if (managed) {
      managed.refCount++;
      if (node.active !== false) {
        managed.order = orderCounter++;
      }
      Object.assign(managed, node);
    } else {
      managed = {
        ...node,
        id,
        refCount: 1,
        order: node.active !== false ? orderCounter++ : -1,
      };
      nodes.set(id, managed);
    }

    sync();

    return {
      id,
      update: (next) => updateNode(id, next),
      dispose: () => disposeNode(id),
    };
  }

  return {
    /** Returns the IDs of the nodes on the current active context path. */
    getActiveContextIds: () => [...activeContextIds],
    /** Registers a context node and returns a handle for updates and disposal. */
    register,
  };
}
