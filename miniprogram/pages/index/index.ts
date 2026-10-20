import type { FilterKind } from '../../models/filterKind';
import * as TodoStore from '../../utils/todoStore';

type Row = { storeIndex: number; text: string; done: boolean };

function dateLabel(): string {
  const now = new Date();
  const weekdays = [
    '星期日',
    '星期一',
    '星期二',
    '星期三',
    '星期四',
    '星期五',
    '星期六',
  ];
  return `${now.getMonth() + 1}月${now.getDate()}日 ${weekdays[now.getDay()]}`;
}

Page({
  data: {
    ready: false,
    input: '',
    filter: 'all' as FilterKind,
    selectedListIndex: null as number | null,
    counts: '',
    rows: [] as Row[],
    dateText: dateLabel(),
  },

  onLoad() {
    TodoStore.loadTodos().then(() => {
      this.refresh();
      this.setData({ ready: true, dateText: dateLabel() });
    });
  },

  refresh() {
    const filter = this.data.filter as FilterKind;
    const indices = TodoStore.filteredIndices(filter);
    const rows: Row[] = indices.map(idx => {
      const item = TodoStore.getItems()[idx];
      return { storeIndex: idx, text: item.Text, done: item.Done };
    });
    let selectedListIndex = this.data.selectedListIndex;
    if (
      selectedListIndex !== null &&
      (selectedListIndex >= rows.length ||
        rows[selectedListIndex]?.storeIndex === undefined)
    ) {
      selectedListIndex = null;
    }
    this.setData({
      rows,
      counts: TodoStore.countsLabel(),
      selectedListIndex,
    });
  },

  onInput(e: WechatMiniprogram.Input) {
    this.setData({ input: e.detail.value });
  },

  onAdd() {
    const text = this.data.input.trim();
    if (!text) {
      return;
    }
    TodoStore.add(text);
    this.setData({ input: '' });
    this.refresh();
  },

  onFilter(e: WechatMiniprogram.TouchEvent) {
    const filter = e.currentTarget.dataset.filter as FilterKind;
    if (!filter) {
      return;
    }
    this.setData({ filter, selectedListIndex: null });
    this.refresh();
  },

  onExport() {
    const text = TodoStore.exportMarkdown();
    wx.setClipboardData({
      data: text,
      success: () => wx.showToast({ title: '已复制到剪贴板', icon: 'success' }),
    });
  },

  onPaste() {
    wx.getClipboardData({
      success: res => {
        const text = res.data?.trim() ?? '';
        if (!text) {
          wx.showToast({ title: '剪贴板为空', icon: 'none' });
          return;
        }
        TodoStore.importMarkdown(text);
        this.refresh();
        wx.showToast({ title: '已从剪贴板导入', icon: 'success' });
      },
    });
  },

  onImport() {
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['md', 'txt', 'json'],
      success: res => {
        const file = res.tempFiles[0];
        const fs = wx.getFileSystemManager();
        const content = fs.readFileSync(file.path, 'utf8') as string;
        const name = (file.name ?? '').toLowerCase();
        if (name.endsWith('.json')) {
          TodoStore.replaceFromJson(content);
        } else {
          TodoStore.importMarkdown(content);
        }
        this.refresh();
        wx.showToast({ title: '导入完成', icon: 'success' });
      },
    });
  },

  onSelectRow(e: WechatMiniprogram.TouchEvent) {
    const index = e.currentTarget.dataset.index as number;
    this.setData({ selectedListIndex: index });
  },

  onToggleDone(e: WechatMiniprogram.TouchEvent) {
    const index = e.currentTarget.dataset.index as number;
    const row = this.data.rows[index];
    if (!row) {
      return;
    }
    TodoStore.setDone(row.storeIndex, !row.done);
    this.refresh();
  },

  onEditRow(e: WechatMiniprogram.TouchEvent) {
    const index = e.currentTarget.dataset.index as number;
    const row = this.data.rows[index];
    if (!row) {
      return;
    }
    wx.showModal({
      title: '编辑待办',
      editable: true,
      placeholderText: row.text,
      success: r => {
        if (!r.confirm || !r.content?.trim()) {
          return;
        }
        TodoStore.updateText(row.storeIndex, r.content);
        this.refresh();
      },
    });
  },

  onDelete() {
    const idx = this.data.selectedListIndex;
    if (idx === null) {
      wx.showToast({ title: '请先选中一条', icon: 'none' });
      return;
    }
    const row = this.data.rows[idx];
    if (!row) {
      return;
    }
    wx.showModal({
      title: '墨迹清单',
      content: '删除这条待办？',
      success: r => {
        if (!r.confirm) {
          return;
        }
        TodoStore.removeAt(row.storeIndex);
        this.setData({ selectedListIndex: null });
        this.refresh();
      },
    });
  },

  onMoveUp() {
    this.moveBy(-1);
  },

  onMoveDown() {
    this.moveBy(1);
  },

  moveBy(delta: number) {
    const idx = this.data.selectedListIndex;
    if (idx === null) {
      wx.showToast({ title: '请先选中一条', icon: 'none' });
      return;
    }
    const row = this.data.rows[idx];
    if (!row) {
      return;
    }
    const newIdx = row.storeIndex + delta;
    if (newIdx < 0 || newIdx >= TodoStore.getItems().length) {
      return;
    }
    TodoStore.moveItem(row.storeIndex, newIdx);
    this.refresh();
    const listIdx = this.data.rows.findIndex(r => r.storeIndex === newIdx);
    if (listIdx >= 0) {
      this.setData({ selectedListIndex: listIdx });
    }
  },
});
