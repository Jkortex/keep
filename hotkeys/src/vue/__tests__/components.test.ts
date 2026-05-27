import { HotkeyCommand, HotkeyContext } from '../components';
import { describe, expect, it, vi } from 'vitest';
import { createHotkeyPlugin } from '../plugin';
import { defineComponent, h, ref } from 'vue';
import { mount } from '@vue/test-utils';

describe('Vue Components', () => {
  const setupRuntime = () => {
    const { install, runtime } = createHotkeyPlugin({
      commands: [{ id: 'test.cmd', title: 'Test' }],
      bindings: [{ commandId: 'test.cmd', keys: 'a' }],
    });
    return { install, runtime };
  };

  it('HotkeyCommand registers and executes a handler via events', async () => {
    const { install, runtime } = setupRuntime();
    const onRun = vi.fn();

    const TestApp = defineComponent({
      setup() {
        return () => h(HotkeyCommand, { id: 'test.cmd', onRun });
      },
    });

    const wrapper = mount(TestApp, { global: { plugins: [install] } });

    // Simulate keydown
    await runtime.handleKeydown(new KeyboardEvent('keydown', { key: 'a' }));
    expect(onRun).toHaveBeenCalled();

    // Unmount should dispose handler
    wrapper.unmount();
    onRun.mockClear();
    await runtime.handleKeydown(new KeyboardEvent('keydown', { key: 'a' }));
    expect(onRun).not.toHaveBeenCalled();
  });

  it('HotkeyContext registers context and supports reactive updates', async () => {
    const { install, runtime } = setupRuntime();
    const isActive = ref(true);

    const TestApp = defineComponent({
      setup() {
        return () =>
          h(
            HotkeyContext,
            { id: 'ctx-1', active: isActive.value },
            { default: () => h('div', 'Content') },
          );
      },
    });

    const wrapper = mount(TestApp, { global: { plugins: [install] } });

    expect(runtime.getSnapshot().contextPath.map((n) => n.id)).toContain(
      'ctx-1',
    );

    isActive.value = false;
    await wrapper.vm.$nextTick();
    expect(runtime.getSnapshot().contextPath).toHaveLength(0);

    wrapper.unmount();
    expect(runtime.getSnapshot().contextPath).toHaveLength(0);
  });

  it('HotkeyContext supports nesting and inheritance', async () => {
    const { install, runtime } = setupRuntime();

    const TestApp = defineComponent({
      setup() {
        return () =>
          h(HotkeyContext, { id: 'parent' }, [
            h(HotkeyContext, { id: 'child' }, [
              h('div', 'Child'),
            ]),
          ]);
      },
    });

    mount(TestApp, { global: { plugins: [install] } });

    const path = runtime.getSnapshot().contextPath;
    expect(path).toHaveLength(2);
    expect(path[0].id).toBe('parent');
    expect(path[1].id).toBe('child');
    expect(path[1].parentId).toBe('parent');
  });
});
