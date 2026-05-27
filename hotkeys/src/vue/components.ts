import { defineComponent } from 'vue';
import { useCmd, useCtx } from './plugin';
import type { HotkeyCommandHandler, HotkeyContextNode } from '../core/types';

/**
 * A renderless component that establishes a hotkey context node for its children.
 * Contexts form a path that allows the runtime to resolve the most specific bindings.
 */
export const HotkeyContext = defineComponent({
  name: 'HotkeyContext',
  props: {
    /** Unique identifier for this context node. */
    id: {
      type: String,
      required: true,
    },
    /** Whether the context is currently active. Defaults to true. */
    active: {
      type: Boolean,
      default: true,
    },
    /** Explicit parent ID. If not provided, it will be inherited from parent HotkeyContext. */
    parentId: {
      type: String,
      default: undefined,
    },
  },
  setup(props, { slots }) {
    useCtx(
      () =>
        ({
          id: props.id,
          active: props.active,
          parentId: props.parentId,
        }) as HotkeyContextNode,
    );

    return () => slots.default?.();
  },
});

/**
 * A renderless component that registers a command handler for the hotkey runtime.
 * The handler is active as long as the component is mounted.
 */
export const HotkeyCommand = defineComponent({
  name: 'HotkeyCommand',
  props: {
    /** The unique identifier of the command to handle. */
    id: {
      type: String,
      required: true,
    },
  },
  emits: {
    /** Emitted when the hotkey runtime triggers this command. */
    run: (payload: Parameters<HotkeyCommandHandler>[0]) => !!payload,
  },
  setup(props, { emit }) {
    useCmd(props.id, (args) => {
      emit('run', args);
    });

    return () => null;
  },
});
