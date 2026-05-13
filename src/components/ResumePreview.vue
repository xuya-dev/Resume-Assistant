<script setup lang="ts">
import {
  Award,
  BriefcaseBusiness,
  FolderKanban,
  GraduationCap,
  Mail,
  MapPin,
  Phone,
  Sparkles,
  SquareArrowOutUpRight,
  Wrench,
} from 'lucide-vue-next'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { ResumeData, ResumeEntry, TemplateId } from '../types/resume'

const props = defineProps<{
  resume: ResumeData
  template: TemplateId
}>()

type SectionId = 'summary' | 'education' | 'work' | 'projects' | 'skills' | 'certifications'

type ResumeBlock =
  | {
      type: 'summary'
      sectionId: SectionId
      sectionTitle: string
      text: string
    }
  | {
      type: 'entry'
      sectionId: SectionId
      sectionTitle: string
      entry: ResumeEntry
    }
  | {
      type: 'chips'
      sectionId: SectionId
      sectionTitle: string
      items: string[]
      variant: 'skills' | 'certifications'
    }

type PageBlock = ResumeBlock & {
  showHeading: boolean
  continued: boolean
}

interface ResumePage {
  id: string
  showHero: boolean
  blocks: PageBlock[]
}

type LayoutKind = 'classic' | 'executive' | 'technical' | 'timeline' | 'editorial' | 'split'

const templateLayouts: Record<TemplateId, LayoutKind> = {
  aqua: 'classic',
  midnight: 'timeline',
  minimal: 'editorial',
  aurora: 'split',
  graphite: 'executive',
  jade: 'editorial',
  cobalt: 'technical',
  rose: 'classic',
  lilac: 'editorial',
  pearl: 'executive',
}

const previewStageRef = ref<HTMLElement | null>(null)
const pageRefs = ref<HTMLElement[]>([])
const previewScale = ref(1)

let resizeObserver: ResizeObserver | undefined

const updatePreviewScale = () => {
  const stage = previewStageRef.value
  if (!stage) return

  const horizontalPadding = 56
  const availableWidth = Math.max(320, stage.clientWidth - horizontalPadding)
  previewScale.value = Math.min(1, availableWidth / 794)
}

const setPageRef = (element: unknown, index: number) => {
  if (element instanceof HTMLElement) {
    pageRefs.value[index] = element
  }
}

const layoutKind = computed(() => templateLayouts[props.template])
const usesSidePanel = computed(() => layoutKind.value === 'executive' || layoutKind.value === 'technical')
const sidebarTitle = computed(() => (props.template === 'cobalt' ? '工程能力' : '核心资料'))
const summaryTitle = computed(() => {
  if (props.template === 'graphite') return '履历摘要'
  if (props.template === 'pearl') return '个人优势'
  return '工程概览'
})
const mainLineChars = computed(() => (usesSidePanel.value ? 36 : props.template === 'minimal' ? 52 : 46))
const sectionIcons = {
  summary: Sparkles,
  education: GraduationCap,
  work: BriefcaseBusiness,
  projects: FolderKanban,
  skills: Wrench,
  certifications: Award,
} satisfies Record<SectionId, unknown>

const contactItems = computed(() =>
  [
    { icon: Phone, text: props.resume.personal.phone },
    { icon: Mail, text: props.resume.personal.email },
    { icon: MapPin, text: props.resume.personal.location },
    { icon: SquareArrowOutUpRight, text: props.resume.personal.website },
  ].filter((item) => item.text),
)

const textLines = (text: string, charsPerLine = 42) => Math.max(1, Math.ceil(text.length / charsPerLine))

const estimateEntryHeight = (entry: ResumeEntry, withHeading: boolean) => {
  const filledDescriptions = entry.description.filter(Boolean)
  const descriptionHeight = filledDescriptions.reduce((total, line) => total + textLines(line, mainLineChars.value) * 24, 0)
  const titleHeight = textLines(`${entry.organization}${entry.title}${entry.period}`, usesSidePanel.value ? 42 : 58) * 12
  const headingHeight = withHeading ? 56 : 12

  return headingHeight + 44 + titleHeight + Math.max(28, descriptionHeight) + 10
}

const estimateBlockHeight = (block: ResumeBlock, withHeading: boolean) => {
  if (block.type === 'summary') return (withHeading ? 56 : 12) + textLines(block.text, mainLineChars.value) * 24 + 8
  if (block.type === 'entry') return estimateEntryHeight(block.entry, withHeading)

  const itemsPerRow = block.variant === 'skills' ? (props.template === 'minimal' ? 6 : 5) : 4
  return (withHeading ? 56 : 12) + Math.ceil(block.items.length / itemsPerRow) * 36 + 8
}

const contentBlocks = computed<ResumeBlock[]>(() => {
  const blocks: ResumeBlock[] = []

  if (!usesSidePanel.value && props.resume.summary.trim()) {
    blocks.push({
      type: 'summary',
      sectionId: 'summary',
      sectionTitle: '个人简介',
      text: props.resume.summary,
    })
  }

  props.resume.education.forEach((entry) => {
    blocks.push({ type: 'entry', sectionId: 'education', sectionTitle: '教育经历', entry })
  })

  props.resume.work.forEach((entry) => {
    blocks.push({ type: 'entry', sectionId: 'work', sectionTitle: '工作经历', entry })
  })

  props.resume.projects.forEach((entry) => {
    blocks.push({ type: 'entry', sectionId: 'projects', sectionTitle: '项目经历', entry })
  })

  if (!usesSidePanel.value && props.resume.skills.length) {
    blocks.push({
      type: 'chips',
      sectionId: 'skills',
      sectionTitle: '技能清单',
      items: props.resume.skills,
      variant: 'skills',
    })
  }

  if (!usesSidePanel.value && props.resume.certifications.length) {
    blocks.push({
      type: 'chips',
      sectionId: 'certifications',
      sectionTitle: '证书奖项',
      items: props.resume.certifications,
      variant: 'certifications',
    })
  }

  return blocks
})

const pages = computed<ResumePage[]>(() => {
  const compact = props.resume.settings.compact
  const pageContentHeight = 1123 - (compact ? 82 : 100)
  const firstPageHeroHeight = usesSidePanel.value ? (compact ? 126 : 152) : compact ? 168 : 190
  const firstPageCapacity = pageContentHeight - firstPageHeroHeight
  const nextPageCapacity = pageContentHeight
  const nextPages: ResumePage[] = []
  const seenSections = new Set<SectionId>()

  let currentPage: ResumePage = { id: 'page-1', showHero: true, blocks: [] }
  let usedHeight = firstPageHeroHeight
  let currentSection: SectionId | '' = ''

  const pushPage = () => {
    nextPages.push(currentPage)
    currentPage = { id: `page-${nextPages.length + 1}`, showHero: false, blocks: [] }
    usedHeight = 0
    currentSection = ''
  }

  contentBlocks.value.forEach((block) => {
    let showHeading = currentSection !== block.sectionId
    let blockHeight = estimateBlockHeight(block, showHeading)
    const capacity = currentPage.showHero ? firstPageCapacity + firstPageHeroHeight : nextPageCapacity

    if (currentPage.blocks.length && usedHeight + blockHeight > capacity) {
      pushPage()
      showHeading = true
      blockHeight = estimateBlockHeight(block, true)
    }

    currentPage.blocks.push({
      ...block,
      showHeading,
      continued: showHeading && seenSections.has(block.sectionId),
    })
    usedHeight += blockHeight
    currentSection = block.sectionId
    seenSections.add(block.sectionId)
  })

  nextPages.push(currentPage)
  return nextPages
})

const shouldShowSidePanel = (page: ResumePage) => page.showHero && usesSidePanel.value
const getSectionIcon = (sectionId: SectionId) => sectionIcons[sectionId]

watch(
  pages,
  () => {
    pageRefs.value = []
  },
  { flush: 'pre' },
)

onMounted(() => {
  updatePreviewScale()
  resizeObserver = new ResizeObserver(updatePreviewScale)
  if (previewStageRef.value) resizeObserver.observe(previewStageRef.value)
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
})

defineExpose({
  getPageElements: () => pageRefs.value.filter(Boolean),
})
</script>

<template>
  <div ref="previewStageRef" class="preview-stage">
    <div class="resume-pages" :style="{ '--preview-scale': previewScale }">
      <div v-for="(page, pageIndex) in pages" :key="page.id" class="resume-page-frame">
        <article
          :ref="(element) => setPageRef(element, pageIndex)"
          class="resume-page"
          :class="[
            `template-${template}`,
            `layout-${layoutKind}`,
            {
              'is-compact': resume.settings.compact,
              'resume-page--side-continuation': usesSidePanel && !shouldShowSidePanel(page),
            },
          ]"
          :aria-label="`简历预览第 ${pageIndex + 1} 页`"
        >
          <div class="resume-layout" :class="{ 'resume-layout--side': shouldShowSidePanel(page) }">
            <aside v-if="shouldShowSidePanel(page)" class="resume-side-panel">
              <div class="resume-side-panel__identity">
                <img v-if="resume.settings.showAvatar" class="resume-side-avatar" :src="resume.personal.avatar" alt="简历头像" />
                <p>{{ resume.personal.title }}</p>
                <h1>{{ resume.personal.name }}</h1>
              </div>

              <div class="side-section">
                <h3>联系方式</h3>
                <span v-for="item in contactItems" :key="item.text" class="side-contact-item">
                  <component :is="item.icon" :size="13" />
                  {{ item.text }}
                </span>
              </div>

              <div v-if="resume.skills.length" class="side-section">
                <h3>{{ sidebarTitle }}</h3>
                <div class="side-chip-list">
                  <span v-for="skill in resume.skills" :key="skill">{{ skill }}</span>
                </div>
              </div>

              <div v-if="resume.certifications.length" class="side-section">
                <h3>证书奖项</h3>
                <div class="side-cert-list">
                  <span v-for="cert in resume.certifications" :key="cert">{{ cert }}</span>
                </div>
              </div>
            </aside>

            <div class="resume-main-panel">
              <header v-if="page.showHero" class="resume-hero">
                <div class="resume-hero__content">
                  <p class="resume-kicker">{{ resume.personal.title }}</p>
                  <h1>{{ usesSidePanel ? summaryTitle : resume.personal.name }}</h1>
                  <p v-if="usesSidePanel && resume.summary" class="resume-hero-summary">{{ resume.summary }}</p>
                  <div v-if="!usesSidePanel" class="contact-line">
                    <span v-for="item in contactItems" :key="item.text">
                      <component :is="item.icon" :size="13" />
                      {{ item.text }}
                    </span>
                  </div>
                </div>
                <img
                  v-if="!usesSidePanel && resume.settings.showAvatar"
                  class="resume-avatar"
                  :src="resume.personal.avatar"
                  alt="简历头像"
                />
              </header>

              <div v-else class="resume-page__continued-head">
                <strong>{{ resume.personal.name }}</strong>
                <span>第 {{ pageIndex + 1 }} 页</span>
              </div>

              <section
                v-for="(block, blockIndex) in page.blocks"
                :key="`${block.sectionId}-${blockIndex}-${block.type}`"
                class="resume-section"
                :class="[
                  `resume-section--${block.sectionId}`,
                  { 'resume-section--continued-entry': !block.showHeading },
                ]"
              >
                <h2 v-if="block.showHeading">
                  <span class="section-marker">
                    <component :is="getSectionIcon(block.sectionId)" :size="14" stroke-width="2" />
                  </span>
                  {{ block.sectionTitle }}{{ block.continued ? '（续）' : '' }}
                </h2>

                <p v-if="block.type === 'summary'" class="summary-text">{{ block.text }}</p>

                <div v-else-if="block.type === 'entry'" class="resume-entry">
                  <div class="resume-entry__top">
                    <div>
                      <strong>{{ block.sectionId === 'projects' ? block.entry.title : block.entry.organization }}</strong>
                      <p>{{ block.sectionId === 'projects' ? block.entry.organization : block.entry.title }}</p>
                    </div>
                    <time>{{ block.entry.period }}</time>
                  </div>
                  <ul>
                    <li v-for="line in block.entry.description.filter(Boolean)" :key="line">{{ line }}</li>
                  </ul>
                </div>

                <div v-else-if="block.variant === 'skills'" class="skill-chips">
                  <span v-for="skill in block.items" :key="skill">{{ skill }}</span>
                </div>
                <div v-else class="cert-line">
                  <span v-for="cert in block.items" :key="cert">{{ cert }}</span>
                </div>
              </section>
            </div>
          </div>
        </article>
      </div>
    </div>
  </div>
</template>
