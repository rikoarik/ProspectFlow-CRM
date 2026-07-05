import 'server-only'
import { isAiConfigured, openAiApiKey, openAiBaseUrl, openAiModel } from '@/lib/env'

export type AiErrorCode = 'missing_key' | 'network' | 'bad_response' | 'rate_limit' | 'unsupported'

export class AiError extends Error {
  code: AiErrorCode
  status?: number
  constructor(code: AiErrorCode, message: string, status?: number) {
    super(message)
    this.code = code
    this.status = status
  }
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatOptions {
  messages: ChatMessage[]
  temperature?: number
  maxTokens?: number
  signal?: AbortSignal
}

interface OpenAiChatResponse {
  choices?: { message?: { content?: string } }[]
  error?: { message?: string; code?: string }
}

interface OpenAiStreamChunk {
  choices?: { delta?: { role?: string; content?: string }; finish_reason?: string | null }[]
  error?: { message?: string; code?: string }
}

export async function chatCompletion({
  messages,
  temperature = 0.7,
  maxTokens = 4096,
  signal,
}: ChatOptions): Promise<string> {
  if (!isAiConfigured()) {
    throw new AiError('missing_key', 'OPENAI_API_KEY belum diisi di .env.local.')
  }

  const base = openAiBaseUrl().replace(/\/+$/, '')
  const url = `${base}/chat/completions`

  // Forward-only abort: if the caller passed a signal (e.g. future job
  // cancellation), honor it. Otherwise there is no client-imposed hard cap here.
  let controller: AbortController | undefined
  if (signal) {
    const c = new AbortController()
    controller = c
    if (signal.aborted) c.abort()
    signal.addEventListener('abort', () => c.abort(), { once: true })
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openAiApiKey()}`,
      },
      body: JSON.stringify({
        model: openAiModel(),
        messages,
        temperature,
        max_tokens: maxTokens,
      }),
      signal: controller?.signal,
    })

    const rawText = await response.text().catch(() => '')

    if (!response.ok) {
      if (response.status === 429 || response.status === 529) {
        throw new AiError('rate_limit', `AI provider rate-limited (${response.status}). ${rawText.slice(0, 200)}`, response.status)
      }
      throw new AiError('bad_response', `AI provider error (${response.status}). ${rawText.slice(0, 200)}`, response.status)
    }

    const contentType = response.headers.get('content-type')?.toLowerCase() ?? ''
    const looksLikeSse = contentType.includes('text/event-stream') || /^\s*data:\s*/i.test(rawText)

    if (looksLikeSse) {
      const content = parseSseChatContent(rawText)
      if (!content) {
        throw new AiError('bad_response', 'AI provider returned an empty SSE stream.')
      }
      return stripThinking(content)
    }

    const payload = JSON.parse(rawText) as OpenAiChatResponse
    const content = payload.choices?.[0]?.message?.content
    if (!content) {
      throw new AiError('bad_response', payload.error?.message ?? 'AI provider returned an empty response.')
    }
    return stripThinking(content)
  } catch (err) {
    if (err instanceof AiError) throw err
    if (err instanceof Error && err.name === 'AbortError') {
      throw new AiError('network', 'Permintaan AI provider dibatalkan.')
    }
    throw new AiError('network', err instanceof Error ? err.message : 'Network error saat memanggil AI provider.')
  }
}

function parseSseChatContent(raw: string): string {
  const lines = raw.split(/\r?\n/)
  let final = ''

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed.startsWith('data:')) continue

    const payload = trimmed.slice(5).trim()
    if (!payload || payload === '[DONE]') continue

    let chunk: OpenAiStreamChunk
    try {
      chunk = JSON.parse(payload) as OpenAiStreamChunk
    } catch {
      continue
    }

    const delta = chunk.choices?.[0]?.delta?.content
    if (delta) final += delta
  }

  return final.trim()
}

function stripThinking(text: string): string {
  // Some reasoning models emit <think>...</think> before the final answer.
  const match = text.match(/<think>[\s\S]*?<\/think>\s*([\s\S]*)/i)
  return match ? match[1].trim() : text.trim()
}
