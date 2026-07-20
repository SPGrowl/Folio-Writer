<script setup lang="ts">
import { computed } from 'vue'
import { EditorState } from '@codemirror/state'
import { Codemirror } from 'vue-codemirror'
import { markdown } from '@codemirror/lang-markdown'
import { oneDarkTheme } from '@codemirror/theme-one-dark'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { syntaxHighlighting, defaultHighlightStyle,HighlightStyle } from '@codemirror/language'
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter} from '@codemirror/view'
import { useAppStore } from '@/store'
import { tags } from '@lezer/highlight'
// 定义参数的默认值与类型
const props = withDefaults(defineProps<{
  modelValue: string
  readonly?: boolean
}>(), {
  readonly: false,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const appStore = useAppStore()

const isDark = computed(() => {
  if (appStore.theme === 'auto')
    // 自动根据系统主题切换
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  return appStore.theme === 'dark'
})
// 自定义markdown主题
const markdownHighlightLight = HighlightStyle.define([
  { tag: tags.heading1, color: '#9C0B00', fontWeight: '700', fontSize: '1.4em' },
  { tag: tags.heading2, color: '#EDCA62', fontWeight: '700', fontSize: '1.25em' },
  { tag: tags.heading3, color: '#8BC34A', fontWeight: '600', fontSize: '1.1em' },
  { tag: tags.heading4, color: '#996CE9', fontWeight: '600' },
  { tag: tags.heading5, color: '#1EB4C9', fontWeight: '600' },
  { tag: tags.heading6, color: '#55A6E6', fontWeight: '600' },
  { tag: tags.strong, color: '#cf222e', fontWeight: '700' },
  { tag: tags.emphasis, color: '#8250df', fontStyle: 'italic' },
  { tag: tags.strikethrough, textDecoration: 'line-through', color: '#6e7781' },
  { tag: tags.link, color: '#0969da', textDecoration: 'underline' },
  { tag: tags.url, color: '#0a3069' },
  { tag: tags.monospace, color: '#cf222e', backgroundColor: '#f6f8fa' },
  { tag: tags.quote, color: '#6e7781', fontStyle: 'italic' },
  { tag: tags.list, color: '#0550ae' },
  { tag: tags.meta, color: '#6e7781' }, // #、*、- 等标记符
  { tag: tags.processingInstruction, color: '#6e7781' },
])

const markdownHighlightDark = HighlightStyle.define([
  { tag: tags.heading1, color: '#F44336', fontWeight: '700', fontSize: '1.4em' },
  { tag: tags.heading2, color: '#FBE297', fontWeight: '700', fontSize: '1.25em' },
  { tag: tags.heading3, color: '#C5EF95', fontWeight: '600', fontSize: '1.1em' },
  { tag: tags.heading4, color: '#BA9EEC', fontWeight: '600' },
  { tag: tags.heading5, color: '#77DDE2', fontWeight: '600' },
  { tag: tags.heading6, color: '#55A8EA', fontWeight: '600' },
  { tag: tags.strong, color: '#ff7b72', fontWeight: '700' },
  { tag: tags.emphasis, color: '#d2a8ff', fontStyle: 'italic' },
  { tag: tags.link, color: '#58a6ff', textDecoration: 'underline' },
  { tag: tags.monospace, color: '#ff7b72', backgroundColor: '#161b22' },
  { tag: tags.quote, color: '#8b949e', fontStyle: 'italic' },
  { tag: tags.meta, color: '#8b949e' },
])

// 亮色还要配一个基础编辑器主题（背景/光标等）
const lightTheme = EditorView.theme({
  '&': { backgroundColor: '#ffffff', color: '#1f2328' },
  '.cm-content': { caretColor: '#1f2328' },
  '&.cm-focused .cm-cursor': { borderLeftColor: '#1f2328' },
  '.cm-activeLine': { backgroundColor: '#f6f8fa' },
  '.cm-gutters': { backgroundColor: '#f6f8fa', color: '#8c959f', border: 'none' },
}, { dark: false })

const extensions = computed(() => [
  // Markdown 语法
  markdown(),

  // 基础编辑能力（无补全）
  lineNumbers(),
  history(),
  EditorView.lineWrapping,
  // 设置 Tab 大小为 2
  EditorState.tabSize.of(2),
  keymap.of([
    ...defaultKeymap,
    ...historyKeymap,
    indentWithTab, // Tab 缩进，不是补全
  ]),
//  高亮本行
highlightActiveLine(),
highlightActiveLineGutter(),
  // 暗色主题
  ...(isDark.value
  ? [oneDarkTheme, syntaxHighlighting(markdownHighlightDark)]
  : [lightTheme, syntaxHighlighting(markdownHighlightLight)]),
  // 只读
  ...(props.readonly ? [EditorView.editable.of(false)] : []),
])

function handleUpdate(value: string) {
  emit('update:modelValue', value)
}
</script>

<template>
  <Codemirror
    :model-value="modelValue"
    :extensions="extensions"
    class="markdown-editor"
    @update:model-value="handleUpdate"
  />
</template>

<style scoped>
/* 撑开编辑器宽高 */
.markdown-editor {
  width: 100%;
  height: 100%;
  font-size: 14px;
}

.markdown-editor :deep(.cm-editor) {
  width: 100%;
  height: 100%;
  outline: none;
}

.markdown-editor :deep(.cm-scroller) {
  overflow: auto;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

/* 亮色模式边框，贴近 Naive UI */
.markdown-editor :deep(.cm-editor) {
  border: 1px solid #e5e7eb;
  border-radius: 6px;
}

.dark .markdown-editor :deep(.cm-editor) {
  border-color: #3f3f46;
}
</style>
