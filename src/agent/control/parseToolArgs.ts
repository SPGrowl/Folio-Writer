export function safeParseToolArgs(raw: string): Record<string, unknown> {
  const trimmed = raw.trim()
  if (!trimmed)
    return {}

  try {
    const parsed = JSON.parse(trimmed)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed))
      return parsed as Record<string, unknown>
    return {}
  }
  catch {
    return {}
  }
}
