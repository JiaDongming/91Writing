<template>
  <div class="chapter-management">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-content">
        <h1>📖 章节管理</h1>
        <p>管理您的小说章节，编辑和组织内容</p>
      </div>
      <div class="header-actions">
        <el-button type="primary" @click="showCreateDialog = true" :disabled="!selectedNovel">
          <el-icon><Plus /></el-icon>
          新建章节
        </el-button>
      </div>
    </div>

    <!-- 小说选择 -->
    <div class="novel-selector">
      <el-card shadow="never">
        <div class="selector-content">
          <div class="selector-left">
            <span class="selector-label">选择小说：</span>
            <el-select 
              v-model="selectedNovelId" 
              placeholder="请选择要管理的小说"
              style="width: 300px;"
              @change="handleNovelChange"
            >
              <el-option
                v-for="novel in novels"
                :key="novel.id"
                :label="novel.title"
                :value="novel.id"
              >
                <div class="novel-option">
                  <span class="novel-title">{{ novel.title }}</span>
                  <span class="novel-info">{{ novel._count?.chapters || 0 }}章 · {{ formatNumber(novel.wordCount || 0) }}字</span>
                </div>
              </el-option>
            </el-select>
          </div>
          
          <div class="selector-right" v-if="selectedNovel">
            <div class="novel-stats">
              <div class="stat-item">
                <span class="stat-label">总章节：</span>
                <span class="stat-value">{{ chapters.length }}章</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">总字数：</span>
                <span class="stat-value">{{ formatNumber(novelTotalWords) }}字</span>
              </div>
            </div>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 章节列表 -->
    <div class="chapters-section" v-if="selectedNovel">
      <el-card shadow="never">
        <template #header>
          <div class="card-header">
            <span>📚 {{ selectedNovel.title }} - 章节列表</span>
            <div class="header-actions">
              <el-button size="small" @click="toggleSortMode" :type="sortMode ? 'primary' : 'default'">
                {{ sortMode ? '完成排序' : '排序' }}
              </el-button>
              <el-button size="small" @click="batchEdit">批量编辑</el-button>
            </div>
          </div>
        </template>
        
        <div v-if="sortMode" class="sort-tip">
          <el-alert
            title="拖拽章节卡片可以调整章节顺序，完成后点击「完成排序」保存"
            type="info"
            :closable="false"
            show-icon
          />
        </div>

        <div class="chapters-list">
          <div
            v-for="(chapter, index) in chapters"
            :key="chapter.id"
            class="chapter-item"
            :class="{
              'selected': selectedChapters.includes(chapter.id),
              'sortable': sortMode
            }"
            :draggable="sortMode"
            @dragstart="onDragStart($event, index)"
            @dragend="onDragEnd"
            @dragover="onDragOver"
            @dragenter="onDragEnter"
            @dragleave="onDragLeave"
            @drop="onDrop($event, index)"
          >
            <div v-if="sortMode" class="drag-handle">
              <el-icon><Rank /></el-icon>
            </div>

            <div class="chapter-checkbox">
              <el-checkbox
                :model-value="selectedChapters.includes(chapter.id)"
                @change="(val) => toggleChapterSelect(chapter.id, val)"
              />
            </div>

            <div class="chapter-number">
              第{{ index + 1 }}章
            </div>

            <div class="chapter-content">
              <div class="chapter-title">
                <h4>{{ chapter.title }}</h4>
                <div class="chapter-status">
                  <el-tag
                    :type="getChapterStatusType(chapter.status)"
                    size="small"
                  >
                    {{ getChapterStatusText(chapter.status) }}
                  </el-tag>
                </div>
              </div>

              <div class="chapter-summary" v-if="chapter.summary">
                {{ chapter.summary }}
              </div>

              <div class="chapter-meta">
                <div class="meta-item">
                  <el-icon><EditPen /></el-icon>
                  <span>{{ formatNumber(chapter.wordCount || 0) }}字</span>
                </div>
                <div class="meta-item">
                  <el-icon><Calendar /></el-icon>
                  <span>{{ formatDate(chapter.updatedAt) }}</span>
                </div>
                <div class="meta-item" v-if="chapter.aiGenerated">
                  <el-icon><EditPen /></el-icon>
                  <span>AI辅助</span>
                </div>
              </div>
            </div>
            
            <div class="chapter-actions">
              <el-button type="text" size="small" @click="editChapter(chapter)">
                <el-icon><Edit /></el-icon>
                编辑
              </el-button>
              <el-button type="text" size="small" @click="viewChapter(chapter)">
                <el-icon><View /></el-icon>
                预览
              </el-button>
              <el-dropdown trigger="click">
                <el-button type="text" size="small">
                  <el-icon><MoreFilled /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item @click="duplicateChapter(chapter)">
                      <el-icon><CopyDocument /></el-icon>
                      复制章节
                    </el-dropdown-item>
                    <el-dropdown-item @click="moveChapter(chapter, 'up')" :disabled="index === 0">
                      <el-icon><ArrowUp /></el-icon>
                      上移
                    </el-dropdown-item>
                    <el-dropdown-item @click="moveChapter(chapter, 'down')" :disabled="index === chapters.length - 1">
                      <el-icon><ArrowDown /></el-icon>
                      下移
                    </el-dropdown-item>
                    <el-dropdown-item divided @click="deleteChapter(chapter)">
                      <el-icon><Delete /></el-icon>
                      删除
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </div>
          
          <div v-if="chapters.length === 0" class="empty-chapters">
            <el-empty description="暂无章节，开始创建您的第一个章节吧！">
              <el-button type="primary" @click="showCreateDialog = true">创建章节</el-button>
            </el-empty>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 未选择小说时的提示 -->
    <div v-else class="no-novel-selected">
      <el-empty description="请先选择一部小说来管理章节">
        <el-button type="primary" @click="$router.push('/novels')">前往小说管理</el-button>
      </el-empty>
    </div>

    <!-- 创建/编辑章节对话框 -->
    <el-dialog 
      v-model="showCreateDialog" 
      :title="editingChapter ? '编辑章节' : '创建新章节'" 
      width="800px"
    >
      <el-form :model="chapterForm" :rules="chapterRules" ref="chapterFormRef" label-width="80px">
        <el-form-item label="章节标题" prop="title">
          <el-input 
            v-model="chapterForm.title" 
            placeholder="请输入章节标题"
            maxlength="100"
            show-word-limit
          />
        </el-form-item>
        
        <el-form-item label="章节摘要">
          <el-input 
            v-model="chapterForm.summary" 
            type="textarea" 
            placeholder="简要描述本章节内容（可选）"
            :rows="3"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>
        
        <el-form-item label="章节状态">
          <el-radio-group v-model="chapterForm.status">
            <el-radio label="draft">草稿</el-radio>
            <el-radio label="writing">写作中</el-radio>
            <el-radio label="completed">已完成</el-radio>
            <el-radio label="published">已发布</el-radio>
          </el-radio-group>
        </el-form-item>
        
        <el-form-item label="章节内容" prop="content">
          <el-input 
            v-model="chapterForm.content" 
            type="textarea" 
            placeholder="开始写作您的章节内容..."
            :rows="15"
            show-word-limit
          />
        </el-form-item>
        
        <el-form-item label="标签">
          <el-input 
            v-model="tagInput"
            placeholder="输入标签后按回车添加"
            @keyup.enter="addChapterTag"
          >
            <template #append>
              <el-button @click="addChapterTag">添加</el-button>
            </template>
          </el-input>
          <div class="tags-display" v-if="chapterForm.tags.length > 0">
            <el-tag 
              v-for="(tag, index) in chapterForm.tags"
              :key="index"
              closable
              @close="removeChapterTag(index)"
              style="margin: 5px 5px 0 0;"
            >
              {{ tag }}
            </el-tag>
          </div>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" @click="saveChapter">保存</el-button>
      </template>
    </el-dialog>

    <!-- 章节预览对话框 -->
    <el-dialog v-model="showPreviewDialog" title="章节预览" width="900px">
      <div v-if="previewChapter" class="chapter-preview">
        <div class="preview-header">
          <h2>{{ previewChapter.title }}</h2>
          <div class="preview-meta">
            <span>字数：{{ previewChapter.wordCount }}</span>
            <span>状态：{{ getChapterStatusText(previewChapter.status) }}</span>
            <span>更新：{{ formatDate(previewChapter.updatedAt) }}</span>
          </div>
        </div>
        <div class="preview-content">
          <p v-for="(paragraph, index) in previewChapter.content.split('\n')" :key="index">
            {{ paragraph }}
          </p>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Plus, EditPen, Calendar, Edit, View, MoreFilled,
  CopyDocument, ArrowUp, ArrowDown, Delete, Rank
} from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import { listNovels, getNovel, createChapter, updateChapter, deleteChapter as apiDeleteChapter } from '@/services/novelApi'

const router = useRouter()

// 响应式数据
const selectedNovelId = ref(null)
const showCreateDialog = ref(false)
const showPreviewDialog = ref(false)
const editingChapter = ref(null)
const previewChapter = ref(null)
const selectedChapters = ref([])
const tagInput = ref('')
const chapterFormRef = ref()

// 小说数据 - 从localStorage加载真实数据
const novels = ref([])

// 章节数据
const chapters = ref([])
const sortMode = ref(false)
const draggedIndex = ref(null)

// 表单数据
const chapterForm = ref({
  title: '',
  summary: '',
  content: '',
  status: 'draft',
  tags: []
})

// 表单验证规则
const chapterRules = {
  title: [
    { required: true, message: '请输入章节标题', trigger: 'blur' },
    { min: 1, max: 100, message: '标题长度在 1 到 100 个字符', trigger: 'blur' }
  ],
  content: [
    { required: true, message: '请输入章节内容', trigger: 'blur' }
  ]
}

// 计算属性
const selectedNovel = computed(() => {
  return novels.value.find(novel => novel.id === selectedNovelId.value)
})

// 方法
const loadNovels = async () => {
  try {
    const data = await listNovels()
    novels.value = data.map(novel => ({
      ...novel,
      createdAt: new Date(novel.createdAt),
      updatedAt: new Date(novel.updatedAt),
      chapters: novel._count?.chapters || 0
    }))
  } catch (error) {
    console.error('加载小说数据失败:', error)
    novels.value = []
  }
}

const formatNumber = (num) => {
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + '万'
  }
  return num.toLocaleString()
}

const formatDate = (date) => {
  if (!date) return ''
  return new Date(date).toLocaleDateString('zh-CN')
}

const getChapterStatusType = (status) => {
  const s = (status || '').toLowerCase()
  const typeMap = {
    draft: '',
    generated: 'warning',
    writing: 'warning',
    reviewed: '',
    completed: 'success',
    published: 'info'
  }
  return typeMap[s] || ''
}

const getChapterStatusText = (status) => {
  const s = (status || '').toLowerCase()
  const textMap = {
    draft: '草稿',
    generated: 'AI生成',
    writing: '写作中',
    reviewed: '已审核',
    completed: '已完成',
    published: '已发布'
  }
  return textMap[s] || s || '未知'
}

// 计算小说总字数（从章节汇总）
const novelTotalWords = computed(() => {
  return chapters.value.reduce((total, ch) => total + (ch.wordCount || 0), 0)
})

const handleNovelChange = (novelId) => {
  loadChapters(novelId)
}

const loadChapters = async (novelId) => {
  try {
    const novel = await getNovel(novelId)
    if (novel && novel.chapters) {
      chapters.value = novel.chapters.map(chapter => ({
        ...chapter,
        createdAt: new Date(chapter.createdAt),
        updatedAt: new Date(chapter.updatedAt)
      }))
    } else {
      chapters.value = []
    }
  } catch (error) {
    console.error('加载章节失败:', error)
    chapters.value = []
  }
}

const reloadChapters = async () => {
  if (!selectedNovelId.value) return
  try {
    const novel = await getNovel(selectedNovelId.value)
    if (novel && novel.chapters) {
      chapters.value = novel.chapters.map(ch => ({
        ...ch,
        createdAt: new Date(ch.createdAt),
        updatedAt: new Date(ch.updatedAt)
      }))
    }
    await loadNovels()
  } catch (error) {
    console.error('加载章节失败:', error)
  }
}

const editChapter = (chapter) => {
  router.push(`/writer?novelId=${selectedNovelId.value}&chapterId=${chapter.id}`)
}

const viewChapter = (chapter) => {
  previewChapter.value = chapter
  showPreviewDialog.value = true
}

const duplicateChapter = async (chapter) => {
  try {
    await createChapter(selectedNovelId.value, {
      title: chapter.title + ' (副本)',
      summary: chapter.summary,
      content: chapter.content,
      wordCount: chapter.wordCount || 0,
      sortOrder: chapters.value.length,
      status: 'DRAFT'
    })
    await reloadChapters()
    ElMessage.success('章节复制成功')
  } catch (error) {
    console.error('复制章节失败:', error)
    ElMessage.error('复制失败')
  }
}

const moveChapter = async (chapter, direction) => {
  const index = chapters.value.findIndex(c => c.id === chapter.id)
  const swapIndex = direction === 'up' ? index - 1 : index + 1
  if (swapIndex < 0 || swapIndex >= chapters.value.length) return

  const target = chapters.value[swapIndex]
  try {
    await updateChapter(chapter.id, { sortOrder: target.sortOrder })
    await updateChapter(target.id, { sortOrder: chapter.sortOrder })
    await reloadChapters()
    ElMessage.success('章节移动成功')
  } catch (error) {
    console.error('移动章节失败:', error)
    ElMessage.error('移动失败')
  }
}

const deleteChapter = async (chapter) => {
  ElMessageBox.confirm(
    `确定要删除章节「${chapter.title}」吗？此操作不可恢复。`,
    '确认删除',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(async () => {
    try {
      await apiDeleteChapter(chapter.id)
      await reloadChapters()
      ElMessage.success('章节删除成功')
    } catch (error) {
      console.error('删除章节失败:', error)
      ElMessage.error('删除失败')
    }
  }).catch(() => {})
}

const saveChapter = async () => {
  try {
    await chapterFormRef.value.validate()
  } catch {
    return
  }

  const wordCount = chapterForm.value.content.replace(/<[^>]*>/g, '').length

  try {
    if (editingChapter.value) {
      await updateChapter(editingChapter.value.id, {
        title: chapterForm.value.title,
        summary: chapterForm.value.summary,
        content: chapterForm.value.content,
        wordCount,
        status: ({ draft: 'DRAFT', writing: 'GENERATED', completed: 'PUBLISHED', published: 'PUBLISHED' })[chapterForm.value.status] || 'DRAFT'
      })
      ElMessage.success('章节更新成功')
    } else {
      await createChapter(selectedNovelId.value, {
        title: chapterForm.value.title,
        summary: chapterForm.value.summary,
        content: chapterForm.value.content,
        wordCount,
        sortOrder: chapters.value.length,
        status: 'DRAFT'
      })
      ElMessage.success('章节创建成功')
    }

    await reloadChapters()
    showCreateDialog.value = false
    resetForm()
  } catch (error) {
    console.error('保存章节失败:', error)
    ElMessage.error(error?.response?.data?.message || '保存失败')
  }
}

const resetForm = () => {
  chapterForm.value = {
    title: '',
    summary: '',
    content: '',
    status: 'draft',
    tags: []
  }
  editingChapter.value = null
  tagInput.value = ''
}

const addChapterTag = () => {
  if (tagInput.value.trim() && !chapterForm.value.tags.includes(tagInput.value.trim())) {
    chapterForm.value.tags.push(tagInput.value.trim())
    tagInput.value = ''
  }
}

const removeChapterTag = (index) => {
  chapterForm.value.tags.splice(index, 1)
}

const toggleSortMode = () => {
  sortMode.value = !sortMode.value
  if (!sortMode.value) {
    draggedIndex.value = null
  }
}

const onDragStart = (e, index) => {
  if (!sortMode.value) return
  draggedIndex.value = index
  e.dataTransfer.effectAllowed = 'move'
  e.dataTransfer.setData('text/plain', index.toString())
  e.target.classList.add('dragging')
}

const onDragEnd = (e) => {
  e.target.classList.remove('dragging')
}

const onDragOver = (e) => {
  if (!sortMode.value) return
  e.preventDefault()
  e.dataTransfer.dropEffect = 'move'
}

const onDragEnter = (e) => {
  if (!sortMode.value) return
  e.preventDefault()
  e.target.closest('.chapter-item')?.classList.add('drag-over')
}

const onDragLeave = (e) => {
  e.target.closest('.chapter-item')?.classList.remove('drag-over')
}

const onDrop = async (e, dropIndex) => {
  e.preventDefault()
  e.target.closest('.chapter-item')?.classList.remove('drag-over')

  const dragIndex = draggedIndex.value
  if (dragIndex === null || dragIndex === dropIndex) {
    draggedIndex.value = null
    return
  }

  const reordered = [...chapters.value]
  const [movedItem] = reordered.splice(dragIndex, 1)
  reordered.splice(dropIndex, 0, movedItem)
  chapters.value = reordered
  draggedIndex.value = null

  await saveChapterOrder(reordered)
}

const saveChapterOrder = async (orderedChapters) => {
  try {
    const updates = orderedChapters.map((chapter, index) =>
      updateChapter(chapter.id, { sortOrder: index })
    )
    await Promise.all(updates)
    ElMessage.success('章节顺序已更新')
  } catch (error) {
    console.error('保存章节顺序失败:', error)
    ElMessage.error('保存排序失败')
    await reloadChapters()
  }
}

const batchEdit = () => {
  if (selectedChapters.value.length === 0) {
    ElMessage.warning('请先选择要编辑的章节')
    return
  }
  ElMessage.info('批量编辑功能开发中...')
}

const toggleChapterSelect = (chapterId, checked) => {
  if (checked) {
    selectedChapters.value.push(chapterId)
  } else {
    selectedChapters.value = selectedChapters.value.filter(id => id !== chapterId)
  }
}

// 生命周期
onMounted(() => {
  // 如果有默认小说，自动选择
  if (novels.value.length > 0) {
    selectedNovelId.value = novels.value[0].id
    loadChapters(selectedNovelId.value)
  }
})

// 监听对话框关闭
watch(showCreateDialog, (newVal) => {
  if (!newVal) {
    resetForm()
  }
})

// 生命周期
onMounted(() => {
  loadNovels()
})
</script>

<style scoped>
.chapter-management {
  padding: 0;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
}

.header-content h1 {
  margin: 0 0 5px 0;
  font-size: 24px;
  font-weight: 600;
  color: #303133;
}

.header-content p {
  margin: 0;
  color: #606266;
  font-size: 14px;
}

.novel-selector {
  margin-bottom: 20px;
}

.selector-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.selector-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.selector-label {
  font-weight: 600;
  color: #303133;
}

.novel-option {
  display: flex;
  flex-direction: column;
}

.novel-title {
  font-weight: 600;
}

.novel-info {
  font-size: 12px;
  color: #909399;
}

.novel-stats {
  display: flex;
  gap: 20px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 5px;
}

.stat-label {
  color: #606266;
  font-size: 14px;
}

.stat-value {
  font-weight: 600;
  color: #303133;
}

.chapters-section {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
}

.chapters-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.chapter-item {
  display: flex;
  align-items: flex-start;
  gap: 15px;
  padding: 15px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  transition: all 0.3s;
}

.chapter-item:hover {
  border-color: #409eff;
  background-color: #f0f9ff;
}

.chapter-item.selected {
  border-color: #409eff;
  background-color: #f0f9ff;
}

.sort-tip {
  margin-bottom: 15px;
}

.drag-handle {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  color: #909399;
  cursor: grab;
  border-radius: 4px;
  transition: all 0.2s;
}

.drag-handle:hover {
  color: #409eff;
  background: #ecf5ff;
}

.drag-handle:active {
  cursor: grabbing;
}

.chapter-item.sortable {
  cursor: default;
}

.chapter-item.sortable:hover {
  border-color: #c6e2ff;
}

.chapter-item.dragging {
  opacity: 0.4;
  border-style: dashed;
}

.chapter-item.drag-over {
  border-color: #409eff;
  background-color: #ecf5ff;
  transform: translateY(2px);
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.2);
}

.chapter-checkbox {
  flex-shrink: 0;
  padding-top: 2px;
}

.chapter-number {
  flex-shrink: 0;
  width: 60px;
  text-align: center;
  font-weight: 600;
  color: #409eff;
  background: #f0f9ff;
  padding: 5px;
  border-radius: 4px;
  font-size: 12px;
}

.chapter-content {
  flex: 1;
}

.chapter-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.chapter-title h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.chapter-summary {
  color: #606266;
  font-size: 14px;
  line-height: 1.4;
  margin-bottom: 10px;
}

.chapter-meta {
  display: flex;
  gap: 15px;
  font-size: 12px;
  color: #909399;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.chapter-actions {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 5px;
}

.no-novel-selected {
  padding: 60px 0;
}

.tags-display {
  margin-top: 10px;
}

.chapter-preview {
  max-height: 600px;
  overflow-y: auto;
}

.preview-header {
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #e4e7ed;
}

.preview-header h2 {
  margin: 0 0 10px 0;
  font-size: 20px;
  font-weight: 600;
  color: #303133;
}

.preview-meta {
  display: flex;
  gap: 15px;
  font-size: 14px;
  color: #606266;
}

.preview-content {
  line-height: 1.8;
  color: #303133;
}

.preview-content p {
  margin: 0 0 15px 0;
  text-indent: 2em;
}

.empty-chapters {
  padding: 40px 0;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    gap: 15px;
  }
  
  .selector-content {
    flex-direction: column;
    gap: 15px;
    align-items: flex-start;
  }
  
  .chapter-item {
    flex-direction: column;
    gap: 10px;
  }
  
  .chapter-actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>