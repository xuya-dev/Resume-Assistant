export type TemplateId = 'aqua' | 'midnight' | 'minimal' | 'aurora' | 'graphite' | 'jade' | 'cobalt'

export interface PersonalInfo {
  name: string
  title: string
  email: string
  phone: string
  location: string
  website: string
  avatar: string
}

export interface ResumeEntry {
  id: string
  title: string
  organization: string
  period: string
  description: string[]
}

export interface ResumeSettings {
  compact: boolean
  showAvatar: boolean
}

export interface ResumeData {
  personal: PersonalInfo
  summary: string
  education: ResumeEntry[]
  work: ResumeEntry[]
  projects: ResumeEntry[]
  skills: string[]
  certifications: string[]
  recognizerText: string
  settings: ResumeSettings
}

export interface ResumeTemplate {
  id: TemplateId
  name: string
  tone: string
}
