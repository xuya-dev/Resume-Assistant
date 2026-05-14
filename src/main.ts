import { createApp } from 'vue'
import {
  ElButton,
  ElCol,
  ElConfigProvider,
  ElDatePicker,
  ElForm,
  ElFormItem,
  ElInput,
  ElInputNumber,
  ElLoading,
  ElOption,
  ElRow,
  ElSelect,
  ElSwitch,
  ElTag,
  ElTooltip,
  ElUpload,
} from 'element-plus'
import 'element-plus/theme-chalk/base.css'
import 'element-plus/theme-chalk/el-button.css'
import 'element-plus/theme-chalk/el-col.css'
import 'element-plus/theme-chalk/el-date-picker.css'
import 'element-plus/theme-chalk/el-form.css'
import 'element-plus/theme-chalk/el-icon.css'
import 'element-plus/theme-chalk/el-input.css'
import 'element-plus/theme-chalk/el-input-number.css'
import 'element-plus/theme-chalk/el-loading.css'
import 'element-plus/theme-chalk/el-message.css'
import 'element-plus/theme-chalk/el-option.css'
import 'element-plus/theme-chalk/el-popper.css'
import 'element-plus/theme-chalk/el-row.css'
import 'element-plus/theme-chalk/el-select.css'
import 'element-plus/theme-chalk/el-switch.css'
import 'element-plus/theme-chalk/el-tag.css'
import 'element-plus/theme-chalk/el-time-picker.css'
import 'element-plus/theme-chalk/el-tooltip.css'
import 'element-plus/theme-chalk/el-upload.css'
import App from './App.vue'
import './styles.css'

const app = createApp(App)

;[ElButton, ElCol,
  ElConfigProvider, ElDatePicker, ElForm, ElFormItem, ElInput,
  ElInputNumber, ElOption, ElRow,
  ElSelect, ElSwitch, ElTag, ElTooltip, ElUpload].forEach((component) => {
  app.use(component)
})

app.use(ElLoading)
app.mount('#app')


