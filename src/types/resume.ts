export type TemplateId =
  | 'aqua'
  | 'midnight'
  | 'minimal'
  | 'aurora'
  | 'graphite'
  | 'jade'
  | 'cobalt'
  | 'rose'
  | 'lilac'
  | 'pearl'

export interface PersonalInfo {
  name: string
  title: string
  email: string
  phone: string
  location: string
  avatar: string
  experience: string
  salary: string
  status: string
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

export interface AiSettings {
  baseUrl: string
  apiKey: string
  model: string
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
  ai: AiSettings
}

export interface ResumeTemplate {
  id: TemplateId
  name: string
  tone: string
}
