import type {
  HotkeyContextManager,
  HotkeyContextNode,
  HotkeyContextRegistration,
  HotkeyRuntime,
} from './types';

interface ManagedNode extends HotkeyContextNode {
  order: number;
  refCount: number;
}

interface ContextPath {
  readonly ids: string[];
  readonly nodes: HotkeyContextNode[];
}

export function createHotkeyContextManager(
  runtime: Pick<HotkeyRuntime, 'emitChange' | 'getSnapshot' | 'setSnapshot'>,
): HotkeyContextManager {
  const nodes = new Map<string, ManagedNode>();
  let orderCounter = 0;
  let activeContextIds: readonly string[] = [];

  function resolveActivePath(leaf: ManagedNode): ContextPath | null {
    const ids: string[] = [];
    const pathNodes: HotkeyContextNode[] = [];
    let current: ManagedNode | undefined = leaf;

    while (current) {
      if (current.active === false) return null;
      ids.push(current.id);
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

  function sync(): void {
    let bestDepth = -1;
    let bestOrder = -1;
    let bestPath: ContextPath | null = null;

    for (const managed of nodes.values()) {
      const path = resolveActivePath(managed);
      if (!path) continue;
      const depth = path.nodes.length;
      if (depth > bestDepth || (depth === bestDepth && managed.order > bestOrder)) {
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

  function updateNode(id: string, node: HotkeyContextNode): void {
    const managed = nodes.get(id);
    if (!managed) return;
    if (managed.active === false && node.active !== false) {
      managed.order = orderCounter++;
    }
    Object.assign(managed, node);
    sync();
  }

  function disposeNode(id: string): void {
    const managed = nodes.get(id);
    if (!managed) return;
    managed.refCount--;
    if (managed.refCount <= 0) {
      nodes.delete(id);
    }
    sync();
  }

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
    getActiveContextIds: () => [...activeContextIds],
    register,
  };
}
