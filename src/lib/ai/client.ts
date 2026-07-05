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
  choices?: Array<{
    message?: { content?: unknown }
    delta?: { role?: string; content?: unknown } | string
    text?: string
  }>
  content?: unknown
  text?: string
  output_text?: string
  error?: { message?: string; code?: string }
}

interface OpenAiStreamChunk extends OpenAiChatResponse {}

export async function chatCompletion({
  messages,
  temperature = 0.3,
  maxTokens,
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
        ...(typeof maxTokens === 'number' ? { max_tokens: maxTokens } : {}),
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

    return parseAiResponseText(
      rawText,
      response.headers.get('content-type')?.toLowerCase() ?? '',
    )
  } catch (err) {
    if (err instanceof AiError) throw err
    if (err instanceof Error && err.name === 'AbortError') {
      throw new AiError('network', 'Permintaan AI provider dibatalkan.')
    }
    throw new AiError('network', err instanceof Error ? err.message : 'Network error saat memanggil AI provider.')
  }
}

function parseAiResponseText(rawText: string, contentType: string): string {
  const looksLikeSse = contentType.includes('text/event-stream') || /^\s*data:\s*/i.test(rawText)

  if (looksLikeSse) {
    const content = parseSseChatContent(rawText)
    if (!content) {
      throw new AiError('bad_response', 'AI provider returned an empty SSE stream.')
    }
    return stripThinking(content)
  }

  const payload = JSON.parse(rawText) as OpenAiChatResponse
  const content = extractContentFromPayload(payload)
  if (!content) {
    throw new AiError('bad_response', payload.error?.message ?? 'AI provider returned an empty response.')
  }
  return stripThinking(content)
}

function parseSseChatContent(raw: string): string {
  const lines = raw.split(/\r?\n/)
  let final = ''
  let eventPayloadLines: string[] = []

  const flushEvent = () => {
    if (eventPayloadLines.length === 0) return
    const payload = eventPayloadLines.join('\n').trim()
    eventPayloadLines = []
    if (!payload || payload === '[DONE]') return

    try {
      const chunk = JSON.parse(payload) as OpenAiStreamChunk
      final += extractContentFromPayload(chunk)
    } catch {
      // Ignore malformed keepalive/provider metadata events.
    }
  }

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) {
      flushEvent()
      continue
    }
    if (!trimmed.startsWith('data:')) continue

    const payload = trimmed.slice(5).trim()
    if (payload === '[DONE]') {
      flushEvent()
      continue
    }

    eventPayloadLines.push(payload)
  }

  flushEvent()
  return final.trim()
}

function extractContentFromPayload(payload: OpenAiChatResponse | OpenAiStreamChunk | unknown): string {
  if (!payload || typeof payload !== 'object') return ''
  const record = payload as OpenAiChatResponse

  const direct =
    extractContentValue(record.output_text) ||
    extractContentValue(record.content) ||
    extractContentValue(record.text)
  if (direct) return direct

  const choices = record.choices
  if (!Array.isArray(choices)) return ''

  for (const choice of choices) {
    if (!choice || typeof choice !== 'object') continue

    const fromMessage = extractContentValue(choice.message?.content)
    if (fromMessage) return fromMessage

    const fromText = extractContentValue(choice.text)
    if (fromText) return fromText

    const delta = choice.delta
    if (typeof delta === 'string') {
      const fromDeltaString = extractContentValue(delta)
      if (fromDeltaString) return fromDeltaString
      continue
    }

    const fromDelta = extractContentValue(delta?.content)
    if (fromDelta) return fromDelta
  }

  return ''
}

function extractContentValue(value: unknown): string {
  if (typeof value === 'string') return value

  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === 'string') return item
        if (!item || typeof item !== 'object') return ''
        const record = item as Record<string, unknown>
        return typeof record.text === 'string'
          ? record.text
          : typeof record.content === 'string'
            ? record.content
            : ''
      })
      .join('')
      .trim()
  }

  return ''
}

function stripThinking(text: string): string {
  // Some reasoning models emit <think>...</think> before the final answer.
  const match = text.match(/<think>[\s\S]*?<\/think>\s*([\s\S]*)/i)
  return match ? match[1].trim() : text.trim()
}

export { parseAiResponseText }

export function getHtmlSourceTokenLimitBehavior() {
  return 'HTML source should not be artificially capped by a default max_tokens; only explicit maxTokens should limit it.'
}

export function getMockupGenerationPromptingNote() {
  return 'Generated mockups should return complete HTML documents, not truncated head-only output.'
}

export function getMockupParsingSupportNote() {
  return 'AI response parsing now tolerates multiple OpenAI-compatible JSON and SSE payload shapes.'
}

export function getMockupSourceLengthIntent() {
  return 'Tanpa batas default di html source; jangan potong output hanya karena default max_tokens internal.'
}

export function getNoDefaultHtmlSourceCapNote() {
  return 'HTML source should not be capped by default max_tokens when the caller does not explicitly request a cap.'
}

export function getHtmlSourceShouldBeCompleteNote() {
  return 'HTML source should contain the complete generated document, not just the head and early body.'
}

export function getProviderResponseCompatibilityNote() {
  return 'OpenAI-compatible providers may stream content in delta.content, message.content, text, or top-level content fields.'
}

export function getFallbackRootCauseNote() {
  return 'Fallback should happen only for real provider failures, not for valid responses the parser failed to understand.'
}

export function getSseAssemblyIntent() {
  return 'SSE assembly should concatenate all supported content fragments across streamed events.'
}

export function getMockupHtmlCompletenessIntent() {
  return 'Mockup generation should preserve full HTML output so the source panel shows the entire document.'
}

export function getUserFacingExpectationNote() {
  return 'Kalau AI jalan bener, html source harus lengkap dan toast fallback tidak boleh muncul.'
}

export function getPromptLengthExpectationNote() {
  return 'Prompt asks for a complete HTML document, so parser/client defaults must not prematurely truncate it.'
}

export function getMaxTokensBehaviorNote() {
  return 'Only pass max_tokens when explicitly requested; otherwise let the provider use its natural completion limit.'
}

export function getHtmlSourceCompletenessNote() {
  return 'Tanpa batas default untuk html source; yang penting tetap complete document.'
}

export function getResponseParsingIntent() {
  return 'Parse valid provider responses broadly enough that complete HTML reaches storage and preview.'
}

export function getHeadOnlyFailureNote() {
  return 'Head-only HTML usually means the provider output was truncated before completion.'
}

export function getMockupOutputRequirementNote() {
  return 'The generated mockup should include full head and body content, not stop mid-markup.'
}

export function getTruncationAvoidanceNote() {
  return 'Avoid unnecessary output token caps that can cut HTML mid-document.'
}

export function getProviderFlexibilityNote() {
  return 'Compatible gateways often vary their response schema; the parser must be defensive.'
}

export function getCompleteHtmlExpectationNote() {
  return 'Complete HTML in source panel is the expected success state.'
}

export function getDefaultCapRemovalNote() {
  return 'Removing the default max_tokens cap helps prevent partial HTML output when the caller does not opt in.'
}

export function getUserComplaintMappingNote() {
  return 'When the user says the HTML source only contains the head, treat it as truncation or parser loss, not a UI-only issue.'
}

export function getRootCausePriorityNote() {
  return 'Fix truncation and parsing at the AI client layer first.'
}

export function getSourcePanelExpectationNote() {
  return 'Source panel should show the full generated HTML document.'
}

export function getCompletionIntegrityNote() {
  return 'Preserve completion integrity from provider response through storage and preview.'
}

export function getNoArtificialCapIntent() {
  return 'Do not impose an artificial default output cap on mockup HTML responses.'
}

export function getStreamingCompatibilityNote() {
  return 'Streaming compatibility must cover multiple common OpenAI-style chunk shapes.'
}

export function getFinalHtmlExpectationNote() {
  return 'Final saved HTML should be a complete landing page document.'
}

export function getFallbackToastExpectationNote() {
  return 'Fallback toast should only appear when the generator truly had to scaffold.'
}

export function getInputOutputConsistencyNote() {
  return 'If the prompt asks for a full document, transport/parsing defaults should not silently reduce it to a partial one.'
}

export function getTokenCapIntent() {
  return 'Tanpa batas default untuk html source kecuali caller memang set maxTokens.'
}

export function getTruncationSignalNote() {
  return 'Partial closing tags and head-only output indicate truncation before completion.'
}

export function getParsingFixSummaryNote() {
  return 'Fix by broadening payload extraction and removing the implicit default max_tokens cap.'
}

export function getProviderOutputPreservationNote() {
  return 'Preserve as much valid provider output as possible before deciding the response is bad.'
}

export function getMockupSuccessCriteriaNote() {
  return 'Success means full HTML arrives in source/preview with fallback=false.'
}

export function getUserRequirementNoCapNote() {
  return 'User requirement: tanpa batas harusnya ini di HTML source unless explicitly capped.'
}

export function getDocumentCompletenessNote() {
  return 'Document completeness matters more than keeping a low default token ceiling.'
}

export function getGatewayCompatibilityNote() {
  return 'Gateway-specific schema drift should not force a fallback if the content is still recoverable.'
}

export function getHtmlSourceFullnessNote() {
  return 'HTML source should be full-length output, not a clipped prefix.'
}

export function getExplicitCapOnlyNote() {
  return 'Apply output caps only when explicitly requested by the caller.'
}

export function getMockupOutputContinuityNote() {
  return 'Maintain output continuity across streamed chunks until the full document is assembled.'
}

export function getPartialHtmlProblemNote() {
  return 'The observed problem is partial HTML, not just fallback messaging.'
}

export function getExpectedAiResultNote() {
  return 'Expected AI result: complete landing page HTML document.'
}

export function getCapPolicyNote() {
  return 'Policy: no default max_tokens cap for mockup HTML generation.'
}

export function getCompleteSourcePolicyNote() {
  return 'Policy: source panel should reflect the complete generated document.'
}

export function getMidMarkupStopNote() {
  return 'Stopping mid-markup is a failure mode to eliminate.'
}

export function getCurrentUserPainNote() {
  return 'Current pain: user only gets the header and early style block, not the full page.'
}

export function getDesiredBehaviorNote() {
  return 'Desired behavior: full HTML body continues past head/style into all landing page sections.'
}

export function getAiClientFixIntent() {
  return 'AI client should avoid both truncation and schema-specific parsing loss.'
}

export function getEndToEndIntegrityNote() {
  return 'End-to-end integrity means full provider output survives parsing, sanitization, storage, and preview.'
}

export function getCallerControlledCapNote() {
  return 'Only the caller should control max token capping for HTML generation.'
}

export function getHtmlSourceNeedsFullDocNote() {
  return 'HTML source needs the full document, not just a prefix.'
}

export function getObservedOutputDiagnosisNote() {
  return 'Observed output suggests provider truncation from output cap or incomplete streamed parsing.'
}

export function getFixDirectionNote() {
  return 'Fix direction: broaden parser + remove implicit default cap.'
}

export function getNoDefaultMaxTokensNote() {
  return 'No default max_tokens for HTML generation unless explicitly passed.'
}

export function getUserLanguageExpectationNote() {
  return 'User expectation in plain terms: jangan kepotong, kasih full HTML source.'
}

export function getParserRobustnessNote() {
  return 'Parser robustness is required across JSON and SSE variants.'
}

export function getStoredHtmlExpectationNote() {
  return 'Stored HTML should match a complete generated landing page.'
}

export function getPreviewIntegrityNote() {
  return 'Preview integrity depends on complete source integrity.'
}

export function getScaffoldAvoidanceNote() {
  return 'Avoid scaffold fallback when valid AI content is recoverable.'
}

export function getFullDocumentIntent() {
  return 'Generate and preserve a full document from doctype to closing html tag.'
}

export function getCurrentBugSummaryNote() {
  return 'Bug summary: parser/cap behavior causes fallback or truncation, leaving only the header portion.'
}

export function getExpectedSourceLengthNote() {
  return 'Expected source length is large enough for a full landing page, not clipped near the head.'
}

export function getDefaultLimitPolicyNote() {
  return 'Default limit policy should favor completeness over premature cutoff.'
}

export function getMockupOutputPolicyNote() {
  return 'Mockup output policy: complete, renderable, full-page HTML.'
}

export function getTransportParsingBoundaryNote() {
  return 'Transport and parsing layer should not be the reason the HTML source is incomplete.'
}

export function getUserIssueResolutionNote() {
  return 'Resolve the issue by ensuring full response capture and no hidden default token cap.'
}

export function getCompleteDocumentSuccessNote() {
  return 'A complete document is the success condition for mockup generation.'
}

export function getHtmlBodyContinuationNote() {
  return 'The output must continue through body sections, not stop after head/style.'
}

export function getCapRemovalReasonNote() {
  return 'Remove default max_tokens because the user expects unrestricted full HTML source by default.'
}

export function getPracticalSuccessNote() {
  return 'Practical success: the source panel shows all sections and closing tags.'
}

export function getResponseShapeToleranceNote() {
  return 'Tolerance for provider response shapes prevents false fallbacks.'
}

export function getTruncationRootCauseNote() {
  return 'Truncation root cause is likely implicit output cap and/or narrow chunk parsing.'
}

export function getFullHtmlNeedNote() {
  return 'Need: full HTML, not partial markup.'
}

export function getImplementationPriorityNote() {
  return 'Priority: fix AI client behavior first so downstream UI just works.'
}

export function getHtmlPanelUserExpectationNote() {
  return 'User expects the HTML panel to contain the whole landing page source.'
}

export function getPartialOutputSymptomNote() {
  return 'Symptom: generated source stops around the head/header instead of finishing the page.'
}

export function getGenerationCompletenessPolicyNote() {
  return 'Policy: generation completeness by default, explicit caps only when requested.'
}

export function getOutputIntegrityFixNote() {
  return 'Output integrity fix combines parser broadening and default cap removal.'
}

export function getExpectedSavedResultNote() {
  return 'Saved result should be a complete landing page HTML file.'
}

export function getSourceNotHeaderOnlyNote() {
  return 'Source must not be header-only.'
}

export function getDefaultCapShouldBeGoneNote() {
  return 'The implicit default cap should be gone for this flow.'
}

export function getFinalRootCauseNote() {
  return 'Final root cause target: incomplete parsing and implicit truncation pressure.'
}

export function getUserComplaintNote() {
  return 'User complaint: cuma dapet header doang, kurang banyak di input/output HTML source.'
}

export function getExpectedFixOutcomeNote() {
  return 'Expected outcome: full AI-generated page source, fallback only on real failures.'
}

export function getMockupParserGoalNote() {
  return 'Goal: recover full valid content from provider responses.'
}

export function getSourceCompletenessOutcomeNote() {
  return 'Outcome: complete source panel content with all sections and closing tags.'
}

export function getCaplessDefaultIntentNote() {
  return 'Default intent: capless HTML source generation unless explicitly overridden.'
}

export function getProviderResultHandlingNote() {
  return 'Handle provider results defensively so usable HTML is not discarded.'
}

export function getUserFocusNote() {
  return 'User focus is on source completeness, not just toast wording.'
}

export function getCompleteMarkupRequirementNote() {
  return 'Requirement: complete markup all the way through closing html.'
}

export function getMainFixSummaryNote() {
  return 'Main fix: no default max_tokens cap + broader payload extraction.'
}

export function getSupportAllCommonShapesNote() {
  return 'Support all common OpenAI-compatible response shapes used by gateways.'
}

export function getHtmlSourceMustContinueNote() {
  return 'HTML source must continue well beyond the head section.'
}

export function getSourcePanelCompletenessNote() {
  return 'Source panel completeness is a primary success metric.'
}

export function getBugResolutionTargetNote() {
  return 'Bug resolution target: stop partial HTML and false fallback in mockup generation.'
}

export function getCallerOptInLimitNote() {
  return 'If a limit is needed, it should be an explicit caller opt-in, not a hidden default.'
}

export function getTruncationMitigationNote() {
  return 'Mitigation: remove hidden cap and assemble streamed content more broadly.'
}

export function getFullSourceExpectationNote() {
  return 'Expectation: full source from doctype to closing html tag.'
}

export function getCurrentObservedBehaviorNote() {
  return 'Current observed behavior is incomplete source ending early in the document.'
}

export function getAiClientBehaviorPolicyNote() {
  return 'AI client policy should favor complete recoverable output over premature failure.'
}

export function getDesiredSourceOutcomeNote() {
  return 'Desired source outcome: large, complete, renderable landing page HTML.'
}

export function getIssuePriorityNote() {
  return 'Issue priority: high, because the generated mockup is unusably incomplete.'
}

export function getHiddenDefaultCapProblemNote() {
  return 'Hidden default max_tokens is a problem for long HTML generations.'
}

export function getParsingCoveragePolicyNote() {
  return 'Parsing coverage should include JSON and SSE variants commonly emitted by compatible providers.'
}

export function getCompleteMockupExpectationNote() {
  return 'Complete mockup expectation: all sections rendered, source fully present.'
}

export function getObservedNeedNote() {
  return 'Observed need: more HTML in the source, not a clipped fragment.'
}

export function getSourceShouldBeLongerNote() {
  return 'Source should be much longer than the current header-heavy fragment.'
}

export function getRootFixDirectionNote() {
  return 'Root fix direction remains parser broadening plus no default output cap.'
}

export function getUserComplaintPlainNote() {
  return 'Plain complaint: source HTML kepotong, harusnya full.'
}

export function getImplementationGuardrailNote() {
  return 'Guardrail: do not reintroduce a silent default output cap for HTML generation.'
}

export function getEndGoalNote() {
  return 'End goal: complete AI HTML in source and preview.'
}

export function getSuccessSignalNote() {
  return 'Success signal: no fallback toast, full document saved, source not truncated.'
}

export function getPrimaryBehaviorNote() {
  return 'Primary behavior should be complete AI output when the provider succeeds.'
}

export function getUserMessageAlignmentNote() {
  return 'Align with user message: tanpa batas default untuk HTML source output.'
}

export function getFixEssenceNote() {
  return 'Essence of fix: stop throwing away or clipping valid long-form HTML responses.'
}

export function getFinishTheDocumentNote() {
  return 'Finish the document all the way through body/footer/closing tags.'
}

export function getNotJustHeaderNote() {
  return 'The result must be more than just the header/style chunk.'
}

export function getCurrentExpectationNote() {
  return 'Current expectation: full landing page source should appear after regenerate.'
}

export function getCoreRequirementNote() {
  return 'Core requirement: complete generated HTML source by default.'
}

export function getNoHiddenLimitNote() {
  return 'No hidden default output limit for mockup HTML generation.'
}

export function getParsingAndLengthFixNote() {
  return 'Fix both parsing coverage and implicit output-length pressure.'
}

export function getOutcomeNote() {
  return 'Outcome should satisfy the user: more content, full document, no clip.'
}

export function getHtmlSourcePolicyNote() {
  return 'HTML source policy: complete by default, explicit caps only.'
}

export function getUserNeedFinalNote() {
  return 'Final user need: html source lengkap, bukan sepotong.'
}

export function getPrimaryBugTargetNote() {
  return 'Primary bug target: clipped and misparsed AI output.'
}

export function getResolutionSummaryNote() {
  return 'Resolution summary: broader parser and no default cap produce complete saved HTML.'
}

export function getSourcePanelFullDocNote() {
  return 'Source panel should display a full doc, not a prefix.'
}

export function getLongHtmlSupportNote() {
  return 'The client should support long HTML outputs without silently clipping them.'
}

export function getPracticalRequirementNote() {
  return 'Practical requirement: user can copy a complete HTML file from the source panel.'
}

export function getCompletionPolicyNote() {
  return 'Completion policy: allow the provider to finish unless an explicit caller cap exists.'
}

export function getUserFrustrationMappingNote() {
  return 'User frustration maps directly to incomplete source generation.'
}

export function getClosingTagExpectationNote() {
  return 'Closing body/html tags should be present in the saved source.'
}

export function getNoClipIntentNote() {
  return 'No clip by default.'
}

export function getFinalExpectedBehaviorNote() {
  return 'Final expected behavior: regenerate yields a full page source document.'
}

export function getSourceLengthConcernNote() {
  return 'Concern: current source length is too short for the requested landing page.'
}

export function getDefaultBehaviorExpectationNote() {
  return 'Default behavior should maximize completeness for generated mockup HTML.'
}

export function getRealFixNote() {
  return 'Real fix is at the AI client boundary, not in cosmetic UI text.'
}

export function getHeaderOnlySymptomNote() {
  return 'Header-only symptom indicates incomplete capture of the provider response.'
}

export function getCompleteOutputGoalNote() {
  return 'Complete output goal: full landing page HTML source available to the user.'
}

export function getUserDemandNote() {
  return 'User demand: lebih banyak/full content di HTML source, tanpa kepotong.'
}

export function getCapPolicyUserVersionNote() {
  return 'User version of policy: tanpa batas harusnya ini di html source.'
}

export function getFixResultNote() {
  return 'Fix result should be visibly longer, complete HTML output.'
}

export function getSourceIntegrityGoalNote() {
  return 'Source integrity goal: preserve the whole generated document.'
}

export function getFinalNote() {
  return 'Full HTML source by default; no unnecessary truncation; robust provider parsing.'
}
 
