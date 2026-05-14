<script setup lang="ts">
import { computed, nextTick, reactive, ref, toRaw, watch } from 'vue'
import { ElMessage } from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import { FileDown, FileText, Github, ImageDown, RefreshCcw, Redo2, Sparkles, Undo2 } from 'lucide-vue-next'
import ResumeEditor from './components/ResumeEditor.vue'
import ResumePreview from './components/ResumePreview.vue'
import SidebarNav from './components/SidebarNav.vue'
import TemplatePicker from './components/TemplatePicker.vue'
import { defaultResume, templates } from './data/resume'
import { callAiChat, extractOfficeText, normalizeAiError, optimizeResumeWithAi, parseJsonFromAi, polishTextWithAi, type AiImportResult } from './services/ai'
import type { ResumeData, TemplateId } from './types/resume'

const cloneResume = (value: ResumeData): ResumeData => JSON.parse(JSON.stringify(value))
const STORAGE_KEY = 'resume-assistant:draft:v1'
const elementLocale = zhCn

interface SavedDraft {
  resume: ResumeData
  selectedTemplate: TemplateId
  activeSection: string
  savedAt: string
}

const isTemplateId = (value: unknown): value is TemplateId =>
  typeof value === 'string' && templates.some((template) => template.id === value)

const mergeResumeDraft = (value: Partial<ResumeData> | undefined): ResumeData => {
  const draft = value ?? {}

  return {
    ...cloneResume(defaultResume),
    ...draft,
    personal: {
      ...defaultResume.personal,
      ...draft.personal,
    },
    education: Array.isArray(draft.education) ? draft.education : cloneResume(defaultResume).education,
    work: Array.isArray(draft.work) ? draft.work : cloneResume(defaultResume).work,
    projects: Array.isArray(draft.projects) ? draft.projects : cloneResume(defaultResume).projects,
    skills: Array.isArray(draft.skills) ? draft.skills : [...defaultResume.skills],
    certifications: Array.isArray(draft.certifications) ? draft.certifications : [...defaultResume.certifications],
    settings: {
      ...defaultResume.settings,
      ...draft.settings,
    },
    ai: {
      ...defaultResume.ai,
      ...draft.ai,
    },
  }
}

const loadSavedDraft = (): SavedDraft | null => {
  try {
    const rawDraft = window.localStorage.getItem(STORAGE_KEY)
    if (!rawDraft) return null

    const parsed = JSON.parse(rawDraft) as Partial<SavedDraft>
    const resumeDraft = mergeResumeDraft(parsed.resume)

    return {
      resume: resumeDraft,
      selectedTemplate: isTemplateId(parsed.selectedTemplate) ? parsed.selectedTemplate : 'aqua',
      activeSection: typeof parsed.activeSection === 'string' ? parsed.activeSection : 'personal',
      savedAt: typeof parsed.savedAt === 'string' ? parsed.savedAt : new Date().toISOString(),
    }
  } catch (error) {
    console.warn('Failed to load local resume draft:', error)
    return null
  }
}

const savedDraft = loadSavedDraft()
const initialResume = savedDraft?.resume ?? cloneResume(defaultResume)

const resume = reactive<ResumeData>(initialResume)
const selectedTemplate = ref<TemplateId>(savedDraft?.selectedTemplate ?? 'aqua')
const activeSection = ref(savedDraft?.activeSection ?? 'personal')
const previewRef = ref<InstanceType<typeof ResumePreview> | null>(null)
const exporting = ref(false)
const saveStatus = ref<'saved' | 'saving' | 'error'>('saved')
const saveStatusText = ref('已自动保存')

const historyStack = ref<ResumeData[]>([cloneResume(initialResume)])
const historyIndex = ref(0)
let historyTimer: number | undefined
let storageTimer: number | undefined
let statusTimer: number | undefined
let restoring = false

const canUndo = computed(() => historyIndex.value > 0)
const canRedo = computed(() => historyIndex.value < historyStack.value.length - 1)

const updateSaveStatus = (status: 'saved' | 'saving' | 'error', text: string) => {
  window.clearTimeout(statusTimer)
  saveStatus.value = status
  saveStatusText.value = text
  if (status === 'saved') {
    statusTimer = window.setTimeout(() => {
      saveStatusText.value = '已自动保存'
    }, 2000)
  }
}

const saveDraft = () => {
  window.clearTimeout(storageTimer)
  updateSaveStatus('saving', '保存中...')

  storageTimer = window.setTimeout(() => {
    try {
      const draft: SavedDraft = {
        resume: cloneResume(toRaw(resume)),
        selectedTemplate: selectedTemplate.value,
        activeSection: activeSection.value,
        savedAt: new Date().toISOString(),
      }

      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft))
      updateSaveStatus('saved', '已保存')
    } catch (error) {
      console.warn('Failed to save local resume draft:', error)
      updateSaveStatus('error', '保存失败')
    }
  }, 300)
}

watch(
  resume,
  () => {
    if (restoring) return
    window.clearTimeout(historyTimer)
    historyTimer = window.setTimeout(() => {
      const snapshot = cloneResume(toRaw(resume))
      const current = historyStack.value[historyIndex.value]

      if (JSON.stringify(snapshot) === JSON.stringify(current)) return

      historyStack.value = historyStack.value.slice(0, historyIndex.value + 1)
      historyStack.value.push(snapshot)
      historyIndex.value = historyStack.value.length - 1
    }, 350)
  },
  { deep: true },
)

const restoreResume = (snapshot: ResumeData) => {
  restoring = true
  Object.assign(resume, cloneResume(snapshot))
  window.setTimeout(() => {
    restoring = false
  })
}

const undo = () => {
  if (!canUndo.value) return
  historyIndex.value -= 1
  restoreResume(historyStack.value[historyIndex.value])
}

const redo = () => {
  if (!canRedo.value) return
  historyIndex.value += 1
  restoreResume(historyStack.value[historyIndex.value])
}

const resetResume = () => {
  restoreResume(defaultResume)
  selectedTemplate.value = 'aqua'
  historyStack.value = [cloneResume(defaultResume)]
  historyIndex.value = 0
}

watch(
  [resume, selectedTemplate, activeSection],
  () => {
    saveDraft()
  },
  { deep: true },
)

const getPageElements = () => previewRef.value?.getPageElements() ?? []

const exportResume = async (format: 'pdf' | 'png') => {
  const pages = getPageElements()
  if (!pages.length) return

  exporting.value = true
  await nextTick()

  try {
    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')])
    const exportScale = Math.max(2, Math.min(3, window.devicePixelRatio * 2))
    const canvases = await Promise.all(
      pages.map((page) =>
        html2canvas(page, {
          backgroundColor: '#ffffff',
          scale: exportScale,
          useCORS: true,
          onclone: (clonedDocument) => {
            clonedDocument.querySelectorAll<HTMLElement>('.resume-page').forEach((clonedPage) => {
              clonedPage.style.transform = 'none'
            })
          },
        }),
      ),
    )

    const filename = `${resume.personal.name || 'resume'}-${resume.personal.title || 'resume'}`

    if (format === 'png') {
      const gap = canvases.length > 1 ? Math.round(32 * exportScale) : 0
      const width = Math.max(...canvases.map((canvas) => canvas.width))
      const height = canvases.reduce((total, canvas) => total + canvas.height, 0) + gap * (canvases.length - 1)
      const mergedCanvas = document.createElement('canvas')
      const context = mergedCanvas.getContext('2d')

      mergedCanvas.width = width
      mergedCanvas.height = height

      if (!context) throw new Error('Canvas context is unavailable')

      context.fillStyle = '#f5fafb'
      context.fillRect(0, 0, width, height)

      let offsetY = 0
      canvases.forEach((canvas) => {
        context.drawImage(canvas, Math.round((width - canvas.width) / 2), offsetY)
        offsetY += canvas.height + gap
      })

      const link = document.createElement('a')
      link.href = mergedCanvas.toDataURL('image/png')
      link.download = `${filename}.png`
      link.click()
      ElMessage.success('PNG 已导出')
      return
    }

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    canvases.forEach((canvas, index) => {
      if (index > 0) pdf.addPage()
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, pageWidth, pageHeight)
    })
    pdf.save(`${filename}.pdf`)
    ElMessage.success('PDF 已导出')
  } catch (error) {
    console.error(error)
    ElMessage.error('导出失败，请稍后重试')
  } finally {
    exporting.value = false
  }
}

const readLabel = (text: string, labels: string[]) => {
  const escaped = labels.join('|')
  const match = text.match(new RegExp(`(?:${escaped})\\s*[:：]\\s*([^\\n]+)`, 'i'))
  return match?.[1]?.trim()
}

const normalize = (value: string) => value.toLowerCase().replace(/[\s./+_-]/g, '')

const makeId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

const normalizeEntries = (items: unknown): ResumeData['education'] => {
  if (!Array.isArray(items)) return []
  return items
    .filter((item): item is Partial<ResumeData['education'][number]> => typeof item === 'object' && item !== null)
    .map((item) => ({
      id: typeof item.id === 'string' ? item.id : makeId(),
      title: typeof item.title === 'string' ? item.title : '',
      organization: typeof item.organization === 'string' ? item.organization : '',
      period: typeof item.period === 'string' ? item.period : '',
      description: Array.isArray(item.description)
        ? item.description.map(String).filter(Boolean)
        : typeof item.description === 'string'
          ? [item.description]
          : [],
    }))
}

const hasOwn = (target: object, key: string) => Object.prototype.hasOwnProperty.call(target, key)

const mergeAiImportResult = (result: AiImportResult) => {
  const applied: string[] = []

  if (result.personal && typeof result.personal === 'object') {
    Object.assign(resume.personal, Object.fromEntries(Object.entries(result.personal).filter(([, value]) => typeof value === 'string')))
    applied.push('个人信息')
  }
  if (typeof result.summary === 'string') {
    resume.summary = result.summary.trim()
    applied.push('个人简介')
  }

  if (hasOwn(result, 'education')) {
    resume.education = normalizeEntries(result.education)
    applied.push('教育经历')
  }
  if (hasOwn(result, 'work')) {
    resume.work = normalizeEntries(result.work)
    applied.push('工作经历')
  }
  if (hasOwn(result, 'projects')) {
    resume.projects = normalizeEntries(result.projects)
    applied.push('项目经历')
  }
  if (Array.isArray(result.skills)) {
    resume.skills = Array.from(new Set(result.skills.map(String).map((skill) => skill.trim()).filter(Boolean)))
    applied.push('技能')
  }
  if (Array.isArray(result.certifications)) {
    resume.certifications = Array.from(new Set(result.certifications.map(String).map((cert) => cert.trim()).filter(Boolean)))
    applied.push('证书奖项')
  }
  if (typeof result.recognizerText === 'string') {
    resume.recognizerText = result.recognizerText.trim()
  }

  return Array.from(new Set(applied))
}

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsDataURL(file)
  })

const readFileAsText = async (file: File) => {
  const officeText = await extractOfficeText(file)
  if (officeText) return officeText
  const buffer = await file.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  const plain = new TextDecoder('utf-8', { fatal: false }).decode(bytes)
  return plain.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ' ').replace(/\s{2,}/g, ' ').slice(0, 18000)
}

const importFileWithAi = async (file: File) => {
  try {
    ElMessage.info('AI 正在解析文件，请稍候')
    const isImage = file.type.startsWith('image/')
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
    const content = isImage
      ? [
          { type: 'text' as const, text: `请识别这张图片中的简历/资料信息，并转换为结构化 JSON。文件名：${file.name}` },
          { type: 'image_url' as const, image_url: { url: await readFileAsDataUrl(file) } },
        ]
      : isPdf
        ? [
            { type: 'text' as const, text: `请直接读取这个 PDF 简历文件，并转换为结构化 JSON。文件名：${file.name}` },
            { type: 'file' as const, file: { filename: file.name, file_data: await readFileAsDataUrl(file) } },
          ]
        : `文件名：${file.name}\n文件类型：${file.type || 'unknown'}\n以下是浏览器端提取的文本内容，可能来自 Word、PPT 或文本文件，请尽力还原简历信息：\n${await readFileAsText(file)}`

    const response = await callAiChat(
      resume.ai,
      [
        {
          role: 'system',
          content:
            '你是简历信息抽取助手。请只返回 JSON，不要 Markdown。JSON 字段：personal{name,title,email,phone,location,experience,salary,status}, summary, education/work/projects 数组，每项包含 title, organization, period, description数组, skills数组, certifications数组, recognizerText。缺失字段用空字符串或空数组。',
        },
        { role: 'user', content },
      ],
      0.2,
    )
    const result = parseJsonFromAi<AiImportResult>(response)
    const applied = mergeAiImportResult(result)
    ElMessage.success(applied.length ? `AI 已填充：${applied.join('、')}` : 'AI 已解析，但未发现可填充字段')
  } catch (error) {
    ElMessage.error(normalizeAiError(error))
  }
}

const polishField = async (value: string, context: string) => {
  try {
    const polished = await polishTextWithAi(resume.ai, value, context)
    ElMessage.success('AI 润色完成')
    return polished
  } catch (error) {
    ElMessage.error(normalizeAiError(error))
    return value
  }
}


const optimizeResume = async () => {
  try {
    ElMessage.info('AI 正在优化整份简历，请稍候')
    const response = await optimizeResumeWithAi(resume.ai, cloneResume(toRaw(resume)))
    const result = parseJsonFromAi<AiImportResult>(response)
    const applied = mergeAiImportResult(result)
    ElMessage.success(applied.length ? `AI 已优化：${applied.join('、')}` : 'AI 已返回，但没有可更新内容')
  } catch (error) {
    ElMessage.error(normalizeAiError(error))
  }
}

const recognizeContent = () => {
  const text = resume.recognizerText.trim()
  if (!text) {
    ElMessage.warning('请先粘贴待识别内容')
    return
  }

  const applied: string[] = []
  const name = readLabel(text, ['姓名', 'name'])
  const title = readLabel(text, ['岗位', '职位', '求职意向', 'title'])
  const city = readLabel(text, ['城市', '所在地', '地址', 'location'])
  const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0]
  const phone = text.match(/(?:\+?86[-\s]?)?1[3-9]\d[-\s]?\d{4}[-\s]?\d{4}/)?.[0]

  if (name) {
    resume.personal.name = name
    applied.push('姓名')
  }
  if (title) {
    resume.personal.title = title
    applied.push('职位')
  }
  if (city) {
    resume.personal.location = city
    applied.push('城市')
  }
  if (email) {
    resume.personal.email = email
    applied.push('邮箱')
  }
  if (phone) {
    resume.personal.phone = phone
    applied.push('电话')
  }

  const summaryMatch = text.match(/(?:个人简介|自我介绍|summary)\s*[:：]\s*([\s\S]{24,240})/i)
  if (summaryMatch) {
    resume.summary = summaryMatch[1].split(/\n(?:教育|工作|项目|技能|证书)/)[0].trim()
    applied.push('简介')
  }

  const skillBank = [
    'HTML5',
    'CSS3',
    'SCSS',
    'JavaScript',
    'TypeScript',
    'Vue 3',
    'Vite',
    'Element Plus',
    'Pinia',
    'React',
    'Node.js',
    'ECharts',
    'Webpack',
    'Git',
    'GitLab',
    'UniApp',
  ]
  const normalizedText = normalize(text)
  const nextSkills = skillBank.filter((skill) => normalizedText.includes(normalize(skill)))
  nextSkills.forEach((skill) => {
    if (!resume.skills.some((current) => normalize(current) === normalize(skill))) {
      resume.skills.push(skill)
    }
  })
  if (nextSkills.length) applied.push('技能')

  ElMessage.success(applied.length ? `已填充：${Array.from(new Set(applied)).join('、')}` : '未识别到可填充字段')
}
</script>

<template>
  <el-config-provider :locale="elementLocale">
  <div class="app-shell" v-loading="exporting" element-loading-text="正在导出">
    <header class="app-toolbar">
      <div class="brand-lockup">
        <span class="brand-mark"><FileText :size="22" /></span>
        <div>
          <h1>在线简历生成器</h1>
          <p>Vue 3 · Vite 7 · Element Plus</p>
        </div>
      </div>

      <div class="toolbar-actions">
        <!-- 保存状态指示器 -->
        <div class="save-indicator" :class="{ 'is-saving': saveStatus === 'saving' }">
          <span class="save-indicator__dot"></span>
          <span>{{ saveStatusText }}</span>
        </div>

        <el-tooltip content="撤销" placement="bottom">
          <el-button :icon="Undo2" circle :disabled="!canUndo" @click="undo" />
        </el-tooltip>
        <el-tooltip content="重做" placement="bottom">
          <el-button :icon="Redo2" circle :disabled="!canRedo" @click="redo" />
        </el-tooltip>
        <el-button :icon="RefreshCcw" plain type="warning" @click="resetResume">重置</el-button>
        <el-button :icon="Sparkles" plain @click="activeSection = 'summary'">智能识别</el-button>
        <el-button :icon="ImageDown" plain type="primary" @click="exportResume('png')">PNG</el-button>
        <el-button :icon="FileDown" type="primary" @click="exportResume('pdf')">PDF</el-button>
        <a href="https://github.com/xuya-dev/Resume-Assistant" target="_blank" rel="noopener noreferrer" class="github-link">
          <el-tooltip content="GitHub 仓库" placement="bottom">
            <el-button :icon="Github" circle />
          </el-tooltip>
        </a>
      </div>
    </header>

    <main class="workspace-grid">
      <SidebarNav v-model:active-section="activeSection" />
      <ResumeEditor
        :resume="resume"
        :active-section="activeSection"
        @recognize="recognizeContent"
        @import-file="importFileWithAi"
        @optimize-resume="optimizeResume"
        :polish-field="polishField"
      />
      <ResumePreview ref="previewRef" :resume="resume" :template="selectedTemplate" />
      <TemplatePicker v-model="selectedTemplate" :templates="templates" />
    </main>
  </div>
  </el-config-provider>
</template>




