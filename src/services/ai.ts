import JSZip from 'jszip'
import type { AiSettings, ResumeData } from '../types/resume'

export interface AiChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string | Array<
    | { type: 'text'; text: string }
    | { type: 'image_url'; image_url: { url: string } }
    | { type: 'file'; file: { filename: string; file_data: string } }
  >
}

export interface AiImportResult {
  personal?: Partial<ResumeData['personal']>
  summary?: string
  education?: ResumeData['education']
  work?: ResumeData['work']
  projects?: ResumeData['projects']
  skills?: string[]
  certifications?: string[]
  recognizerText?: string
}

const buildChatUrl = (baseUrl: string) => {
  const trimmed = baseUrl.trim().replace(/\/+$/, '')
  if (!trimmed) throw new Error('请先填写 AI 地址')
  if (/\/chat\/completions$/i.test(trimmed)) return trimmed
  return `${trimmed}/chat/completions`
}

const getErrorMessage = (value: unknown) => {
  if (value instanceof Error) return value.message
  return String(value || 'AI 调用失败')
}

const assertAiSettings = (settings: AiSettings) => {
  if (!settings.baseUrl.trim()) throw new Error('请先在设置中填写 AI 地址')
  if (!settings.apiKey.trim()) throw new Error('请先在设置中填写 API Key')
  if (!settings.model.trim()) throw new Error('请先在设置中填写模型名称')
}

export const callAiChat = async (settings: AiSettings, messages: AiChatMessage[], temperature = 0.35) => {
  assertAiSettings(settings)

  const response = await fetch(buildChatUrl(settings.baseUrl), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${settings.apiKey.trim()}`,
    },
    body: JSON.stringify({
      model: settings.model.trim(),
      messages,
      temperature,
    }),
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(payload?.error?.message || payload?.message || `AI 请求失败：${response.status}`)
  }

  const content = payload?.choices?.[0]?.message?.content
  if (typeof content !== 'string' || !content.trim()) throw new Error('AI 未返回有效内容')
  return content.trim()
}

export const polishTextWithAi = async (settings: AiSettings, text: string, context: string) => {
  if (!text.trim()) throw new Error('当前输入框没有可润色内容')

  return callAiChat(
    settings,
    [
      {
        role: 'system',
        content:
          '你是专业中文简历优化助手。只返回润色后的字段内容，不要解释，不要使用 Markdown。保持真实可信，突出行动、技术和量化结果。',
      },
      {
        role: 'user',
        content: `字段：${context}\n原文：${text.trim()}\n请润色为更适合中文简历的表达。`,
      },
    ],
    0.45,
  )
}

export const optimizeResumeWithAi = async (settings: AiSettings, resume: ResumeData) =>
  callAiChat(
    settings,
    [
      {
        role: 'system',
        content:
          '你是专业中文简历优化助手。只返回 JSON，不要 Markdown。保持个人信息、学校、公司、时间、证书等事实字段不变；只优化 summary、work.description、projects.description、education.description、skills、certifications。可以精简空泛表达，强化动词、技术栈、业务价值和量化结果。字段结构必须与输入简历一致。',
      },
      {
        role: 'user',
        content: `请优化这份简历，并返回完整 JSON：\n${JSON.stringify(resume)}`,
      },
    ],
    0.35,
  )

export const parseJsonFromAi = <T>(content: string): T => {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]
  const raw = (fenced || content).trim()
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) throw new Error('AI 返回内容不是可解析 JSON')
  return JSON.parse(raw.slice(start, end + 1)) as T
}

const decodeXml = (value: string) =>
  value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/\s{2,}/g, ' ')
    .trim()

export const extractOfficeText = async (file: File) => {
  const lowerName = file.name.toLowerCase()
  if (!lowerName.endsWith('.docx') && !lowerName.endsWith('.pptx')) return ''

  const zip = await JSZip.loadAsync(await file.arrayBuffer())
  const paths = Object.keys(zip.files).filter((path) => {
    if (lowerName.endsWith('.docx')) return /^word\/.*\.xml$/i.test(path)
    return /^ppt\/slides\/slide\d+\.xml$/i.test(path)
  })

  const chunks = await Promise.all(paths.map(async (path) => decodeXml(await zip.files[path].async('string'))))
  return chunks.filter(Boolean).join('\n').slice(0, 24000)
}
export const normalizeAiError = getErrorMessage





