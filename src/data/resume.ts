import avatarUrl from '../assets/default-avatar.jpg'
import type { ResumeData, ResumeTemplate } from '../types/resume'

export const templates: ResumeTemplate[] = [
  { id: 'aqua', name: '青瓷卡片', tone: '清爽 / 科技' },
  { id: 'midnight', name: '夜航深色', tone: '沉稳 / 高级' },
  { id: 'minimal', name: '极简留白', tone: '干净 / 专业' },
  { id: 'aurora', name: '晨光渐层', tone: '活力 / 产品' },
  { id: 'graphite', name: '石墨商务', tone: '利落 / 管理' },
  { id: 'jade', name: '竹影青绿', tone: '自然 / 运营' },
  { id: 'cobalt', name: '钴蓝专栏', tone: '理性 / 工程' },
  { id: 'rose', name: '玫瑰雅白', tone: '优雅 / 品牌' },
  { id: 'lilac', name: '雾紫清函', tone: '柔和 / 创意' },
  { id: 'pearl', name: '珍珠侧影', tone: '轻奢 / 行政' },
]

export const defaultResume: ResumeData = {
  personal: {
    name: '青衣',
    title: '全栈开发工程师',
    email: 'xuya_dev@qq.com',
    phone: '138 8888 8888',
    location: '杭州市',
    website: 'https://github.com/xuya-dev',
    avatar: avatarUrl,
  },
  summary:
    '具备 Java 与 Python 全栈应用从需求分析、接口设计、前端交互、后端服务到部署运维的完整交付经验。熟悉 Spring Boot、Django / FastAPI、Vue 3、MySQL、Redis 与 Docker，关注系统可维护性、接口性能和工程化效率。',
  education: [
    {
      id: 'edu-1',
      title: '计算机科学与技术（本科）',
      organization: '复旦大学',
      period: '2016.09 - 2020.06',
      description: ['主修课程：数据结构、计算机网络、操作系统、数据库原理。'],
    },
  ],
  work: [
    {
      id: 'work-1',
      title: '全栈开发工程师',
      organization: '星澜云科技有限公司',
      period: '2020.07 - 至今',
      description: [
        '负责 SaaS 业务平台的前后端功能开发，参与需求评审、领域建模、接口设计与上线发布。',
        '基于 Vue 3、Spring Boot、FastAPI 与 MySQL 构建订单、权限、报表和消息通知等核心模块。',
        '通过 Redis 缓存、SQL 索引优化、异步任务拆分与接口限流，将高频接口平均响应时间降低 45%。',
      ],
    },
  ],
  projects: [
    {
      id: 'project-1',
      title: '企业协作平台（Vue 3 + Spring Boot）',
      organization: '项目负责人 / Java 全栈开发',
      period: '2023.03 - 2023.09',
      description: [
        '设计任务、成员、权限、文件协作等核心数据模型，并完成 RESTful API 与前端页面开发。',
        '基于 Spring Boot、MyBatis-Plus、MySQL 和 Redis 实现权限校验、文件管理、消息通知等服务。',
        '使用 Docker Compose 编排前端、Java 服务、MySQL、Redis，支持测试环境一键部署。',
      ],
    },
    {
      id: 'project-2',
      title: '数据看板与自动化报表系统（Python + FastAPI）',
      organization: 'Python 后端 / 可视化开发',
      period: '2022.05 - 2022.11',
      description: [
        '基于 FastAPI、Pandas 与定时任务完成业务数据清洗、聚合统计和报表接口开发。',
        '前端使用 Vue 3 与 ECharts 实现实时指标、趋势分析、异常告警和多维筛选。',
        '接入 Celery 与 Redis 处理异步报表生成任务，支持邮件推送和失败重试。',
      ],
    },
  ],
  skills: [
    'Vue 3',
    'TypeScript',
    'Java',
    'Spring Boot',
    'MyBatis-Plus',
    'Python',
    'FastAPI',
    'Django',
    'MySQL',
    'Redis',
    'Docker',
    'RESTful API',
    'Celery',
    'ECharts',
    'Linux',
  ],
  certifications: ['软件设计师', 'Oracle Certified Java Programmer', '大学英语六级'],
  recognizerText:
    '姓名：青衣\n岗位：Java / Python 全栈开发工程师\n电话：138 8888 8888\n邮箱：xuya_dev@qq.com\n城市：杭州市\n技能：Java、Spring Boot、MyBatis-Plus、Python、FastAPI、Django、Vue3、TypeScript、MySQL、Redis、Docker、ECharts',
  settings: {
    compact: false,
    showAvatar: true,
  },
}
