<script setup lang="ts">
import {
  Award,
  BriefcaseBusiness,
  FolderKanban,
  GraduationCap,
  Settings,
  Sparkles,
  UserRound,
} from 'lucide-vue-next'

const activeSection = defineModel<string>('activeSection', { required: true })

const sections = [
  { id: 'personal', label: '基本信息', icon: UserRound },
  { id: 'summary', label: '智能识别', icon: Sparkles },
  { id: 'education', label: '教育经历', icon: GraduationCap },
  { id: 'work', label: '工作经历', icon: BriefcaseBusiness },
  { id: 'projects', label: '项目经历', icon: FolderKanban },
  { id: 'certs', label: '技能证书', icon: Award },
  { id: 'settings', label: '更多设置', icon: Settings },
]
</script>

<template>
  <nav class="side-nav" aria-label="简历编辑导航">
    <button
      v-for="(section, index) in sections"
      :key="section.id"
      class="side-nav__item"
      :class="{ 'is-active': activeSection === section.id }"
      :style="{ animationDelay: `${index * 0.03}s` }"
      type="button"
      @click="activeSection = section.id"
    >
      <component :is="section.icon" :size="20" stroke-width="1.9" />
      <span>{{ section.label }}</span>
    </button>
  </nav>
</template>
