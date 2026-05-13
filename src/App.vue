<script setup lang="ts">
import { computed, nextTick, reactive, ref, toRaw, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { FileDown, FileText, ImageDown, RefreshCcw, Redo2, Sparkles, Undo2 } from 'lucide-vue-next'
import ResumeEditor from './components/ResumeEditor.vue'
import ResumePreview from './components/ResumePreview.vue'
import SidebarNav from './components/SidebarNav.vue'
import TemplatePicker from './components/TemplatePicker.vue'
import { defaultResume, templates } from './data/resume'
import type { ResumeData, TemplateId } from './types/resume'

const cloneResume = (value: ResumeData): ResumeData => JSON.parse(JSON.stringify(value))

const resume = reactive<ResumeData>(cloneResume(defaultResume))
const selectedTemplate = ref<TemplateId>('aqua')
const activeSection = ref('personal')
const previewRef = ref<InstanceType<typeof ResumePreview> | null>(null)
const exporting = ref(false)

const historyStack = ref<ResumeData[]>([cloneResume(defaultResume)])
const historyIndex = ref(0)
let historyTimer: number | undefined
let restoring = false

const canUndo = computed(() => historyIndex.value > 0)
const canRedo = computed(() => historyIndex.value < historyStack.value.length - 1)

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
        <el-tooltip content="撤销" placement="bottom">
          <el-button :icon="Undo2" circle :disabled="!canUndo" @click="undo" />
        </el-tooltip>
        <el-tooltip content="重做" placement="bottom">
          <el-button :icon="Redo2" circle :disabled="!canRedo" @click="redo" />
        </el-tooltip>
        <el-tooltip content="恢复示例" placement="bottom">
          <el-button :icon="RefreshCcw" circle @click="resetResume" />
        </el-tooltip>
        <el-button :icon="Sparkles" plain @click="activeSection = 'summary'">智能识别</el-button>
        <el-button :icon="ImageDown" plain type="primary" @click="exportResume('png')">PNG</el-button>
        <el-button :icon="FileDown" type="primary" @click="exportResume('pdf')">PDF</el-button>
      </div>
    </header>

    <main class="workspace-grid">
      <SidebarNav v-model:active-section="activeSection" />
      <ResumeEditor :resume="resume" :active-section="activeSection" @recognize="recognizeContent" />
      <ResumePreview ref="previewRef" :resume="resume" :template="selectedTemplate" />
      <TemplatePicker v-model="selectedTemplate" :templates="templates" />
    </main>
  </div>
</template>
