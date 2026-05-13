<script setup lang="ts">
import { Check, LayoutGrid } from 'lucide-vue-next'
import type { ResumeTemplate, TemplateId } from '../types/resume'

defineProps<{
  templates: ResumeTemplate[]
}>()

const selectedTemplate = defineModel<TemplateId>({ required: true })
</script>

<template>
  <aside class="template-panel" aria-label="模板选择">
    <div class="panel-title">
      <LayoutGrid :size="18" />
      <span>选择模板</span>
    </div>

    <button
      v-for="template in templates"
      :key="template.id"
      type="button"
      class="template-option"
      :class="[`template-option--${template.id}`, { 'is-active': selectedTemplate === template.id }]"
      @click="selectedTemplate = template.id"
    >
      <span class="template-option__thumb" aria-hidden="true">
        <i />
        <b />
        <em />
        <strong />
      </span>
      <span class="template-option__meta">
        <span>{{ template.name }}</span>
        <small>{{ template.tone }}</small>
      </span>
      <span class="template-option__check">
        <Check v-if="selectedTemplate === template.id" :size="16" />
      </span>
    </button>
  </aside>
</template>
