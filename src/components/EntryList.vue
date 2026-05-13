<script setup lang="ts">
import { Plus, Trash2 } from 'lucide-vue-next'
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
}>()

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

const removeBullet = (item: ResumeEntry, index: number) => {
  item.description.splice(index, 1)
  if (!item.description.length) item.description.push('')
}
</script>

<template>
  <div class="entry-list">
    <article v-for="item in items" :key="item.id" class="entry-card">
      <div class="entry-card__header">
        <el-input v-model="item.title" :placeholder="titlePlaceholder" />
        <el-button :icon="Trash2" circle text type="danger" aria-label="删除条目" @click="removeEntry(item.id)" />
      </div>

      <el-row :gutter="12">
        <el-col :span="12" :xs="24">
          <el-form-item label="机构 / 公司">
            <el-input v-model="item.organization" :placeholder="organizationPlaceholder" />
          </el-form-item>
        </el-col>
        <el-col :span="12" :xs="24">
          <el-form-item label="时间">
            <el-input v-model="item.period" :placeholder="periodPlaceholder" />
          </el-form-item>
        </el-col>
      </el-row>

      <div class="bullet-editor">
        <div v-for="(_, index) in item.description" :key="index" class="bullet-editor__row">
          <el-input
            v-model="item.description[index]"
            type="textarea"
            :autosize="{ minRows: 1, maxRows: 3 }"
            :placeholder="bulletPlaceholder"
          />
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
