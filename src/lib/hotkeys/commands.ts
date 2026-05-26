import type {
  HotkeyBindingDefinition,
  HotkeyCommandDefinition,
} from './types';

export const KEEP_COMMANDS: HotkeyCommandDefinition[] = [
  {
    id: 'app.nav.home',
    title: '回到首页',
    category: '导航',
    aliases: ['home'],
  },
  {
    id: 'app.theme.toggle',
    title: '切换主题',
    category: '系统',
    aliases: ['theme', 'dark'],
  },
  {
    id: 'app.palette.open',
    title: '命令面板',
    category: '导航',
    aliases: ['palette', 'cmd', 'go'],
  },
  {
    id: 'app.search.open',
    title: '搜索',
    category: '导航',
    aliases: ['search', 'find'],
    visibleWhen: (s) => !s.flags['search.open'],
  },
  {
    id: 'app.help.toggle',
    title: '快捷键帮助',
    category: '系统',
    aliases: ['help', 'keys'],
    visibleWhen: (s) => !s.flags['help.open'],
  },
  {
    id: 'app.search.focus',
    title: '聚焦搜索输入框',
    category: '导航',
    aliases: ['focus-search'],
    visibleWhen: (s) => s.flags['search.open'],
  },
];

export const KEEP_BINDINGS: HotkeyBindingDefinition[] = [
  {
    commandId: 'app.nav.home',
    keys: 'g h',
    context: { id: 'app/root' },
  },
  {
    commandId: 'app.theme.toggle',
    keys: 't',
    context: { id: 'app/root' },
  },
  {
    commandId: 'app.palette.open',
    keys: 'ctrl+p',
    context: { id: 'app/root' },
  },
  {
    commandId: 'app.palette.open',
    keys: 'ctrl+shift+p',
    context: { id: 'app/root' },
  },
  {
    commandId: 'app.palette.open',
    keys: 'ctrl+e',
    context: { id: 'app/root' },
  },
  {
    commandId: 'app.search.open',
    keys: '/',
    context: { id: 'app/root' },
    when: (s) => !s.flags['help.open'],
  },
  {
    commandId: 'app.search.open',
    keys: 'ctrl+k',
    context: { id: 'app/root' },
    when: (s) => !s.flags['help.open'],
  },
  {
    commandId: 'app.search.open',
    keys: 'ctrl+shift+f',
    context: { id: 'app/root' },
    when: (s) => !s.flags['help.open'],
  },
  {
    commandId: 'app.help.toggle',
    keys: '?',
    context: { id: 'app/root' },
  },
  {
    commandId: 'app.help.toggle',
    keys: 'shift+/',
    context: { id: 'app/root' },
  },
];
