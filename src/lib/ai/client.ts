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
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 90_000)
  // If the caller passed their own signal, fan-in its abort.
  if (signal) {
    if (signal.aborted) controller.abort()
    signal.addEventListener('abort', () => controller.abort(), { once: true })
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
      signal: controller.signal,
    })

    if (!response.ok) {
      const text = await response.text().catch(() => '')
      if (response.status === 429 || response.status === 529) {
        throw new AiError('rate_limit', `AI provider rate-limited (${response.status}). ${text.slice(0, 200)}`, response.status)
      }
      throw new AiError('bad_response', `AI provider error (${response.status}). ${text.slice(0, 200)}`, response.status)
    }

    const payload = (await response.json()) as OpenAiChatResponse
    const content = payload.choices?.[0]?.message?.content
    if (!content) {
      throw new AiError('bad_response', payload.error?.message ?? 'AI provider returned an empty response.')
    }
    return stripThinking(content)
  } catch (err) {
    if (err instanceof AiError) throw err
    if (err instanceof Error && err.name === 'AbortError') {
      throw new AiError('network', 'AI provider belum merespons setelah 90 detik. Coba ulangi atau sederhanakan brief.')
    }
    throw new AiError('network', err instanceof Error ? err.message : 'Network error saat memanggil AI provider.')
  } finally {
    clearTimeout(timeout)
  }
}

function stripThinking(text: string): string {
  // Some reasoning models emit <think>...</think> before the final answer.
  const match = text.match(/<think>[\s\S]*?<\/think>\s*([\s\S]*)/i)
  return match ? match[1].trim() : text.trim()
}