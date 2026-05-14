<script setup lang="ts">
import { ref } from 'vue'
import { Plus, Trash2, WandSparkles } from 'lucide-vue-next'
import type { ResumeEntry } from '../types/resume'

const props = defineProps<{
  items: ResumeEntry[]
  addLabel: string
  titlePlaceholder: string
  organizationPlaceholder: string
  periodPlaceholder: string
  bulletPlaceholder: string
  defaultTitle: string
  defaultOrganization: string
  polishField: (value: string, context: string) => Promise<string>
}>()

const polishingKey = ref('')

const makeId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

const addEntry = () => {
  props.items.push({
    id: makeId(),
    title: props.defaultTitle,
    organization: props.defaultOrganization,
    period: '2024.01 - 至今',
    description: [props.bulletPlaceholder],
  })
}

const removeEntry = (id: string) => {
  const index = props.items.findIndex((item) => item.id === id)
  if (index > -1) props.items.splice(index, 1)
}

const addBullet = (item: ResumeEntry) => {
  item.description.push('')
}

const parsePeriodRange = (period: string) => {
  const matches = period.match(/\d{4}[.-]\d{1,2}/g)
  return matches?.slice(0, 2).map((item) => item.replace('.', '-').replace(/-(\d)$/, '-0$1')) ?? []
}

const getPeriodStart = (period: string) => parsePeriodRange(period)[0] ?? ''
const getPeriodEnd = (period: string) => parsePeriodRange(period)[1] ?? ''

const updatePeriodPart = (item: ResumeEntry, part: 'start' | 'end', value: string) => {
  const current = parsePeriodRange(item.period)
  const start = part === 'start' ? value : current[0]
  const end = part === 'end' ? value : current[1]
  item.period = [start, end].filter(Boolean).map((date) => date.replace('-', '.')).join(' - ')
}

const removeBullet = (item: ResumeEntry, index: number) => {
  item.description.splice(index, 1)
  if (!item.description.length) item.description.push('')
}

const polishValue = async (getter: () => string, setter: (value: string) => void, context: string, key: string) => {
  polishingKey.value = key
  try {
    setter(await props.polishField(getter(), context))
  } finally {
    polishingKey.value = ''
  }
}
</script>

<template>
  <div class="entry-list">
    <article v-for="item in items" :key="item.id" class="entry-card">
      <div class="entry-card__header">
        <el-input v-model="item.title" :placeholder="titlePlaceholder" />
        <el-button :icon="Trash2" circle text type="danger" aria-label="删除条目" @click="removeEntry(item.id)" />
      </div>

      <el-row :gutter="12" class="form-row-single">
        <el-col :span="24">
          <el-form-item label="机构 / 公司">
            <el-input v-model="item.organization" :placeholder="organizationPlaceholder" />
          </el-form-item>
        </el-col>
        <el-col :span="24">
          <el-form-item label="时间">
            <div class="period-picker-row">
              <el-date-picker
                class="form-control-full"
                type="month"
                format="YYYY年MM月"
                value-format="YYYY-MM"
                placeholder="开始月份"
                :model-value="getPeriodStart(item.period)"
                @update:model-value="(value: string) => updatePeriodPart(item, 'start', value)"
              />
              <span>至</span>
              <el-date-picker
                class="form-control-full"
                type="month"
                format="YYYY年MM月"
                value-format="YYYY-MM"
                placeholder="结束月份"
                :model-value="getPeriodEnd(item.period)"
                @update:model-value="(value: string) => updatePeriodPart(item, 'end', value)"
              />
            </div>
          </el-form-item>
        </el-col>
      </el-row>

      <div class="bullet-editor">
        <div v-for="(_, index) in item.description" :key="index" class="bullet-editor__row">
          <div class="ai-field-stack">
            <el-input
              v-model="item.description[index]"
              type="textarea"
              :autosize="{ minRows: 1, maxRows: 3 }"
              :placeholder="bulletPlaceholder"
            />
            <el-button :icon="WandSparkles" :loading="polishingKey === `${item.id}.description.${index}`" plain @click="polishValue(() => item.description[index], (value) => (item.description[index] = value), bulletPlaceholder, `${item.id}.description.${index}`)">AI 润色</el-button>
          </div>
          <el-button
            :icon="Trash2"
            circle
            text
            aria-label="删除描述"
            @click="removeBullet(item, index)"
          />
        </div>
        <el-button :icon="Plus" text type="primary" @click="addBullet(item)">添加描述</el-button>
      </div>
    </article>

    <el-button class="entry-list__add" :icon="Plus" plain type="primary" @click="addEntry">
      {{ addLabel }}
    </el-button>
  </div>
</template>
