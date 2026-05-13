<script setup lang="ts">
import { ref } from 'vue'
import type { UploadFile } from 'element-plus'
import { BadgeCheck, Plus, Upload, WandSparkles, X } from 'lucide-vue-next'
import EntryList from './EntryList.vue'
import type { ResumeData } from '../types/resume'

const props = defineProps<{
  resume: ResumeData
  activeSection: string
}>()

const emit = defineEmits<{
  recognize: []
}>()

const skillDraft = ref('')
const certDraft = ref('')

const readImage = (file: File) => {
  const reader = new FileReader()
  reader.onload = () => {
    props.resume.personal.avatar = String(reader.result)
  }
  reader.readAsDataURL(file)
}

const handleAvatarChange = (file: UploadFile) => {
  if (file.raw) readImage(file.raw)
}

const appendUnique = (target: string[], rawValue: string) => {
  rawValue
    .split(/[,，、\n]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .forEach((item) => {
      if (!target.some((current) => current.toLowerCase() === item.toLowerCase())) {
        target.push(item)
      }
    })
}

const addSkill = () => {
  appendUnique(props.resume.skills, skillDraft.value)
  skillDraft.value = ''
}

const addCert = () => {
  appendUnique(props.resume.certifications, certDraft.value)
  certDraft.value = ''
}

const removeSkill = (index: number) => {
  props.resume.skills.splice(index, 1)
}

const removeCert = (index: number) => {
  props.resume.certifications.splice(index, 1)
}
</script>

<template>
  <section class="editor-panel" aria-label="简历编辑表单">
    <div v-show="activeSection === 'personal'" class="editor-section">
      <div class="editor-section__title">个人信息</div>
      <el-form label-position="top" class="section-form">
        <div class="avatar-row">
          <el-upload
            action="#"
            :auto-upload="false"
            :show-file-list="false"
            :on-change="handleAvatarChange"
            accept="image/png,image/jpeg,image/webp"
          >
            <button type="button" class="avatar-control">
              <img :src="resume.personal.avatar" alt="头像预览" />
              <span><Upload :size="16" />上传头像</span>
            </button>
          </el-upload>
        </div>

        <el-row :gutter="12">
          <el-col :span="12" :xs="24">
            <el-form-item label="姓名">
              <el-input v-model="resume.personal.name" placeholder="姓名" />
            </el-form-item>
          </el-col>
          <el-col :span="12" :xs="24">
            <el-form-item label="职位">
              <el-input v-model="resume.personal.title" placeholder="目标职位" />
            </el-form-item>
          </el-col>
          <el-col :span="12" :xs="24">
            <el-form-item label="邮箱">
              <el-input v-model="resume.personal.email" placeholder="email@example.com" />
            </el-form-item>
          </el-col>
          <el-col :span="12" :xs="24">
            <el-form-item label="电话">
              <el-input v-model="resume.personal.phone" placeholder="联系电话" />
            </el-form-item>
          </el-col>
          <el-col :span="12" :xs="24">
            <el-form-item label="所在地">
              <el-input v-model="resume.personal.location" placeholder="城市" />
            </el-form-item>
          </el-col>
          <el-col :span="12" :xs="24">
            <el-form-item label="主页">
              <el-input v-model="resume.personal.website" placeholder="作品集 / GitHub" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
    </div>

    <div v-show="activeSection === 'summary'" class="editor-section">
      <div class="editor-section__title">个人简介</div>
      <el-form label-position="top" class="section-form">
        <el-form-item label="简介">
          <el-input
            v-model="resume.summary"
            type="textarea"
            :autosize="{ minRows: 4, maxRows: 8 }"
            placeholder="用 2-4 句话概括专业能力、项目经验与求职方向"
          />
        </el-form-item>
        <el-form-item label="待识别内容">
          <el-input
            v-model="resume.recognizerText"
            type="textarea"
            :autosize="{ minRows: 7, maxRows: 12 }"
            placeholder="粘贴简历原文、JD 或个人资料"
          />
        </el-form-item>
        <el-button type="primary" :icon="WandSparkles" @click="emit('recognize')">识别并填充</el-button>
      </el-form>
    </div>

    <div v-show="activeSection === 'education'" class="editor-section">
      <div class="editor-section__title">教育经历</div>
      <EntryList
        :items="resume.education"
        add-label="新增教育经历"
        title-placeholder="专业 / 学位"
        organization-placeholder="学校名称"
        period-placeholder="2016.09 - 2020.06"
        bullet-placeholder="主修课程、荣誉奖项或研究方向"
        default-title="专业 / 学位"
        default-organization="学校名称"
      />
    </div>

    <div v-show="activeSection === 'work'" class="editor-section">
      <div class="editor-section__title">工作经历</div>
      <EntryList
        :items="resume.work"
        add-label="新增工作经历"
        title-placeholder="职位名称"
        organization-placeholder="公司名称"
        period-placeholder="2020.07 - 至今"
        bullet-placeholder="职责、结果或量化成果"
        default-title="职位名称"
        default-organization="公司名称"
      />
    </div>

    <div v-show="activeSection === 'projects'" class="editor-section">
      <div class="editor-section__title">项目经历</div>
      <EntryList
        :items="resume.projects"
        add-label="新增项目经历"
        title-placeholder="项目名称"
        organization-placeholder="项目角色 / 场景"
        period-placeholder="2023.03 - 2023.09"
        bullet-placeholder="技术方案、负责模块或项目成果"
        default-title="项目名称"
        default-organization="项目角色"
      />
    </div>

    <div v-show="activeSection === 'certs'" class="editor-section">
      <div class="editor-section__title">技能证书</div>
      <div class="skill-block">
        <label class="field-label">技能标签</label>
        <el-input v-model="skillDraft" placeholder="输入技能，回车添加" @keyup.enter="addSkill">
          <template #append>
            <el-button :icon="Plus" @click="addSkill" />
          </template>
        </el-input>
        <div class="tag-cloud">
          <el-tag v-for="(skill, index) in resume.skills" :key="skill" closable @close="removeSkill(index)">
            {{ skill }}
          </el-tag>
        </div>
      </div>

      <div class="skill-block">
        <label class="field-label">证书 / 奖项</label>
        <el-input v-model="certDraft" placeholder="输入证书，回车添加" @keyup.enter="addCert">
          <template #append>
            <el-button :icon="BadgeCheck" @click="addCert" />
          </template>
        </el-input>
        <div class="tag-cloud">
          <el-tag
            v-for="(cert, index) in resume.certifications"
            :key="cert"
            closable
            type="success"
            @close="removeCert(index)"
          >
            {{ cert }}
          </el-tag>
        </div>
      </div>
    </div>

    <div v-show="activeSection === 'settings'" class="editor-section">
      <div class="editor-section__title">页面设置</div>
      <div class="settings-list">
        <label class="settings-row">
          <span>显示头像</span>
          <el-switch v-model="resume.settings.showAvatar" />
        </label>
        <label class="settings-row">
          <span>紧凑排版</span>
          <el-switch v-model="resume.settings.compact" />
        </label>
        <button type="button" class="plain-action" @click="resume.skills = []">
          <X :size="16" />
          清空技能标签
        </button>
      </div>
    </div>
  </section>
</template>
