<script setup lang="ts">
import { computed } from 'vue'
import { EditorState } from '@codemirror/state'
import { Codemirror } from 'vue-codemirror'
import { markdown } from '@codemirror/lang-markdown'
import { unifiedMergeView } from '@codemirror/merge'
import { oneDarkTheme } from '@codemirror/theme-one-dark'
import { syntaxHighlighting, HighlightStyle } from '@codemirror/language'
import { EditorView, lineNumbers } from '@codemirror/view'
import { useAppStore } from '@/store'
import { tags } from '@lezer/highlight'

const props = defineProps<{
  original: string
  proposed: string
}>()

const appStore = useAppStore()

const isDark = computed(() => {
  if (appStore.theme === 'auto')
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  return appStore.theme === 'dark'
})

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
  { tag: tags.meta, color: '#6e7781' },
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

const lightTheme = EditorView.theme({
  '&': { backgroundColor: '#ffffff', color: '#1f2328' },
  '.cm-content': { caretColor: '#1f2328' },
  '.cm-gutters': { backgroundColor: '#f6f8fa', color: '#8c959f', border: 'none' },
}, { dark: false })

const extensions = computed(() => [
  markdown(),
  lineNumbers(),
  EditorView.lineWrapping,
  EditorState.tabSize.of(2),
  unifiedMergeView({
    original: props.original,
    highlightChanges: true,
    gutter: true,
    mergeControls: false,
  }),
  EditorView.editable.of(false),
  EditorState.readOnly.of(true),
  ...(isDark.value
    ? [oneDarkTheme, syntaxHighlighting(markdownHighlightDark)]
    : [lightTheme, syntaxHighlighting(markdownHighlightLight)]),
])
</script>

<template>
  <Codemirror
    :model-value="proposed"
    :extensions="extensions"
    class="diff-markdown-editor"
  />
</template>

<style scoped>
.diff-markdown-editor {
  width: 100%;
  height: 100%;
  font-size: 14px;
}

.diff-markdown-editor :deep(.cm-editor) {
  width: 100%;
  height: 100%;
  outline: none;
  border: 1px solid rgba(248, 113, 113, 0.45);
  border-radius: 6px;
}

.dark .diff-markdown-editor :deep(.cm-editor) {
  border-color: rgba(248, 113, 113, 0.35);
}

.diff-markdown-editor :deep(.cm-scroller) {
  overflow: auto;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.diff-markdown-editor :deep(.cm-deletedChunk) {
  background-color: rgba(255, 0, 0, 0.08);
}

.diff-markdown-editor :deep(.cm-changedLine) {
  background-color: rgba(46, 160, 67, 0.12);
}

.dark .diff-markdown-editor :deep(.cm-deletedChunk) {
  background-color: rgba(248, 81, 73, 0.15);
}

.dark .diff-markdown-editor :deep(.cm-changedLine) {
  background-color: rgba(46, 160, 67, 0.18);
}
</style>
