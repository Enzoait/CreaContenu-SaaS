import { useDashboardData } from '../../../entities/dashboard/model/use-dashboard-data'
import {
  useDashboardPeriod,
  useDashboardPlatform,
  useSetDashboardPeriod,
  useSetDashboardPlatform,
} from '../../../features/dashboard-filters/model/dashboard-filters-store'
import {
  addPlanningItem,
  updatePlanningItem,
  deletePlanningItem as deletePlanningItemApi,
  renamePlatformInPlanning,
  deletePlatformInPlanning,
} from '../../../entities/dashboard/api/planning-api'
import {
  addVideoItem,
  updateVideoItem,
  deleteVideoItem as deleteVideoItemApi,
  renamePlatformInVideos,
  deletePlatformInVideos,
} from '../../../entities/dashboard/api/videos-api'
import {
  addTodoItem,
  updateTodoItem,
  deleteTodoItem as deleteTodoItemApi,
  renamePlatformInTodos,
  deletePlatformInTodos,
} from '../../../entities/dashboard/api/todos-api'
import { useAuthStore, selectAuthUser } from '../../../shared/model/auth-store'
import {
  addUserPlatform,
  renameUserPlatform,
  deleteUserPlatform,
} from '../../../entities/dashboard/api/platforms-api'
import styles from './dashboard-overview.module.scss'
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type ReactNode,
  type TouchEvent,
} from 'react'
import {
  CartesianGrid,
  ComposedChart,
  Line,
  Bar,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { AiOutlineDelete, AiOutlineEdit } from 'react-icons/ai'
import { HiBars3, HiChevronDown } from 'react-icons/hi2'
import { useNavigate } from 'react-router-dom'
import { useProfileTitleSuffix } from '../../../features/account-profile'
import { useAccountAvatarDataUrl } from '../../../pages/account-page/model'
import { CreatorAppShell } from '../../creator-app-shell'
import { useI18n } from '../../../shared/i18n'

/** Contenus sans plateforme utilisateur définie (remplace l’ancien repli « general ») */
const NO_PLATFORM_LABEL = 'pas de plateforme'

/** Préfixes `text/plain` pour le DnD — certains navigateurs ne relisent pas les types MIME personnalisés au drop */
const DND_VIDEO_PLAIN_PREFIX = 'creacontent-video:'
const DND_PLANNING_PLAIN_PREFIX = 'creacontent-planning:'
const DND_PANEL_PLAIN_PREFIX = 'creacontent-panel:'
const DND_TASK_PLAIN_PREFIX = 'creacontent-task:'

function normalizePlatformLabel(name: string): string {
  if (name === 'general') return NO_PLATFORM_LABEL
  return name
}

type TodoColumn = 'todo' | 'doing' | 'done'
type VideoStage = 'idea' | 'scripting' | 'recording' | 'editing' | 'published'
type PanelId = 'planning' | 'videos' | 'todo' | 'chart'

function isPanelId(value: string): value is PanelId {
  return (
    value === 'planning' || value === 'videos' || value === 'todo' || value === 'chart'
  )
}

type SuggestionItem = {
  label: string        // texte affiché dans le dropdown (enrichi si ambigu)
  panel: PanelId
  targetId: string | null
  detail?: string
  searchTerm?: string  // terme brut pour setSearch + highlight (= label original)
}

type PlanningItem = {
  id: string
  title: string
  platform: string
  publishAt: string
  status: 'draft' | 'scheduled' | 'published'
  /** Présent si l’entrée provient d’un suivi vidéo (sync échéance) */
  videoId?: string
}

type PlanningDraft = {
  title: string
  platform: string
  publishAt: string
  status: 'draft' | 'scheduled' | 'published'
}

type VideoItem = {
  id: string
  title: string
  platform: string
  stage: VideoStage
  deadline: string
  createdAt?: string
  /** Ordre manuel (liste suivi vidéo) */
  sortOrder?: number
}

function compareVideosBySort(a: VideoItem, b: VideoItem): number {
  const so = (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
  if (so !== 0) return so
  const byDeadline = b.deadline.localeCompare(a.deadline)
  if (byDeadline !== 0) return byDeadline
  const ac = a.createdAt ?? ''
  const bc = b.createdAt ?? ''
  const byCreated = bc.localeCompare(ac)
  if (byCreated !== 0) return byCreated
  return b.id.localeCompare(a.id)
}

function mergeFilteredReorderIntoGlobal(
  globalIds: string[],
  filteredSet: Set<string>,
  newFilteredOrder: string[],
): string[] {
  const firstIdx = globalIds.findIndex((id) => filteredSet.has(id))
  if (firstIdx === -1) return globalIds
  const tail = globalIds.slice(firstIdx).filter((id) => !filteredSet.has(id))
  const head = globalIds.slice(0, firstIdx)
  return [...head, ...newFilteredOrder, ...tail]
}

type VideoDraft = {
  title: string
  platform: string
  deadline: string
  stage: VideoStage
}

type ChecklistItem = {
  id: string
  text: string
  done: boolean
}

type BoardTask = {
  id: string
  label: string
  platform: string
  priority: 'low' | 'medium' | 'high'
  column: TodoColumn
  checklist: ChecklistItem[]
  newChecklistText: string
}

type TodoDraft = {
  label: string
  platform: string
  priority: 'low' | 'medium' | 'high'
  column: TodoColumn
}

function formatNumber(value: number, localeTag: string): string {
  return new Intl.NumberFormat(localeTag).format(value)
}

function formatDateLabel(dateString: string, localeTag: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString(localeTag, {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  })
}

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function toDateKey(dateInput: string | Date): string {
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseDateSafe(dateString: string): Date {
  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(dateString)
  return new Date(isDateOnly ? `${dateString}T00:00:00` : dateString)
}

function toSearchTargetId(prefix: string, value: string): string {
  return `${prefix}-${encodeURIComponent(value)}`
}

function toMonthLabel(date: Date, localeTag: string): string {
  return date.toLocaleDateString(localeTag, {
    month: 'long',
    year: 'numeric',
  })
}

function highlightMatch(text: string, search: string): ReactNode {
  const needle = search.trim()
  if (!needle) return text
  const lowerText = text.toLowerCase()
  const lowerNeedle = needle.toLowerCase()
  const index = lowerText.indexOf(lowerNeedle)
  if (index < 0) return text
  const start = text.slice(0, index)
  const match = text.slice(index, index + needle.length)
  const end = text.slice(index + needle.length)
  return (
    <>
      {start}
      <mark>{match}</mark>
      {end}
    </>
  )
}

function isInPeriod(dateString: string, period: '7d' | '30d' | '90d' | 'all'): boolean {
  if (period === 'all') return true
  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90
  const today = new Date()
  const date = parseDateSafe(dateString)
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const end = new Date(start)
  end.setDate(end.getDate() + days)
  return date >= start && date <= end
}

export function DashboardOverview() {
  const profileTitleSuffix = useProfileTitleSuffix()
  const user = useAuthStore(selectAuthUser)
  const avatarDataUrl = useAccountAvatarDataUrl()
  const { data, isLoading, isError } = useDashboardData()
  const period = useDashboardPeriod()
  const platform = useDashboardPlatform()
  const setPeriod = useSetDashboardPeriod()
  const setPlatform = useSetDashboardPlatform()

  const [focusedPanel, setFocusedPanel] = useState<null | PanelId>(null)
  const [highlightedPanel, setHighlightedPanel] = useState<null | PanelId>(null)
  const [highlightedItemId, setHighlightedItemId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [platforms, setPlatforms] = useState<string[]>([])
  const [newPlatformName, setNewPlatformName] = useState('')
  const [isAddingPlatform, setIsAddingPlatform] = useState(false)
  const [editingPlatformName, setEditingPlatformName] = useState<string | null>(null)
  const [editingPlatformValue, setEditingPlatformValue] = useState('')
  const [platformToDelete, setPlatformToDelete] = useState<string | null>(null)
  const [planningData, setPlanningData] = useState<PlanningItem[]>([])
  const [planningDraft, setPlanningDraft] = useState<PlanningDraft>({
    title: '',
    platform: '',
    publishAt: '',
    status: 'draft',
  })
  const [editingPlanningId, setEditingPlanningId] = useState<string | null>(null)
  const [isPlanningFormOpen, setIsPlanningFormOpen] = useState(false)
  const [planningToDelete, setPlanningToDelete] = useState<PlanningItem | null>(null)
  const [videoToDelete, setVideoToDelete] = useState<VideoItem | null>(null)
  const [todoToDelete, setTodoToDelete] = useState<BoardTask | null>(null)
  const [draggingPlanningId, setDraggingPlanningId] = useState<string | null>(null)
  const [draggingVideoId, setDraggingVideoId] = useState<string | null>(null)
  const [dragOverVideoId, setDragOverVideoId] = useState<string | null>(null)
  const [dragOverDateKey, setDragOverDateKey] = useState<string | null>(null)
  const [videoData, setVideoData] = useState<VideoItem[]>([])
  const [videoDraft, setVideoDraft] = useState<VideoDraft>({
    title: '',
    platform: '',
    deadline: '',
    stage: 'idea',
  })
  const [editingVideoId, setEditingVideoId] = useState<string | null>(null)
  const [isVideoFormOpen, setIsVideoFormOpen] = useState(false)
  const [todoBoard, setTodoBoard] = useState<BoardTask[]>([])
  const [todoDraft, setTodoDraft] = useState<TodoDraft>({
    label: '',
    platform: '',
    priority: 'medium',
    column: 'todo',
  })
  const [editingTodoId, setEditingTodoId] = useState<string | null>(null)
  const [isTodoFormOpen, setIsTodoFormOpen] = useState(false)
  const [videoStages, setVideoStages] = useState<Record<string, VideoStage>>({})
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false)
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<TodoColumn | null>(null)
  const [touchDragTaskId, setTouchDragTaskId] = useState<string | null>(null)
  const [touchOverColumn, setTouchOverColumn] = useState<TodoColumn | null>(null)
  const navigate = useNavigate()
  const [panelOrder, setPanelOrder] = useState<PanelId[]>(['planning', 'videos', 'todo', 'chart'])
  const [draggingPanel, setDraggingPanel] = useState<PanelId | null>(null)
  const [dragOverPanel, setDragOverPanel] = useState<PanelId | null>(null)
  const [collapsedPanels, setCollapsedPanels] = useState<Record<PanelId, boolean>>({
    planning: false,
    videos: false,
    todo: false,
    chart: false,
  })
  const [displayedMonthStart, setDisplayedMonthStart] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const panelCardRefs = useRef<Record<PanelId, HTMLElement | null>>({
    planning: null,
    videos: null,
    todo: null,
    chart: null,
  })
  /** Synchrone au dragstart — le state React peut ne pas être à jour au moment du drop */
  const draggingPanelRef = useRef<PanelId | null>(null)
  const draggingTaskIdRef = useRef<string | null>(null)
  const draggingVideoIdRef = useRef<string | null>(null)

  const { t, localeTag } = useI18n()

  const panelLabels = useMemo(
    () =>
      ({
        planning: t('dashboard.panelPlanning'),
        videos: t('dashboard.panelVideos'),
        todo: t('dashboard.panelTodo'),
        chart: t('dashboard.panelChart'),
      }) satisfies Record<PanelId, string>,
    [t],
  )

  const columnLabels = useMemo(
    () => ({
      todo: t('dashboard.colTodo'),
      doing: t('dashboard.colDoing'),
      done: t('dashboard.colDone'),
    }),
    [t],
  )

  const stageLabels = useMemo(
    () => ({
      idea: t('dashboard.stageIdea'),
      scripting: t('dashboard.stageScripting'),
      recording: t('dashboard.stageRecording'),
      editing: t('dashboard.stageEditing'),
      published: t('dashboard.stagePublished'),
    }),
    [t],
  )

  const statusLabels = useMemo(
    () => ({
      draft: t('dashboard.statusDraft'),
      scheduled: t('dashboard.statusScheduled'),
      published: t('dashboard.statusPublished'),
    }),
    [t],
  )

  const priorityLabels = useMemo(
    () => ({
      low: t('dashboard.priorityLow'),
      medium: t('dashboard.priorityMedium'),
      high: t('dashboard.priorityHigh'),
    }),
    [t],
  )

  useEffect(() => {
    if (!data) return
    setPlanningData(
      (data.planning as PlanningItem[]).map((item) => ({
        ...item,
        platform: normalizePlatformLabel(item.platform),
      })),
    )
    setVideoData(
      (data.videos as VideoItem[]).map((item) => ({
        ...item,
        platform: normalizePlatformLabel(item.platform),
      })),
    )
    setTodoBoard(
      data.todos.map((todo) => ({
        id: todo.id,
        label: todo.label,
        platform: normalizePlatformLabel(todo.platform),
        priority: todo.priority,
        column: todo.column ?? (todo.done ? 'done' : 'todo'),
        checklist: [],
        newChecklistText: '',
      })),
    )
    setVideoStages(
      Object.fromEntries(data.videos.map((video) => [video.id, video.stage])) as Record<
        string,
        VideoStage
      >,
    )

    const rawList =
      data.platforms && data.platforms.length > 0
        ? data.platforms
        : [
            ...data.planning.map((item) => item.platform),
            ...data.videos.map((item) => item.platform),
            ...data.todos.map((item) => item.platform),
          ]
    const uniquePlatforms = Array.from(
      new Set(rawList.map(normalizePlatformLabel)),
    )
    setPlatforms(uniquePlatforms)
    const defaultDraftPlatform = uniquePlatforms[0] ?? NO_PLATFORM_LABEL
    setPlanningDraft((prev) => ({
      ...prev,
      platform: prev.platform || defaultDraftPlatform,
    }))
    setVideoDraft((prev) => ({
      ...prev,
      platform: prev.platform || defaultDraftPlatform,
    }))
    setTodoDraft((prev) => ({
      ...prev,
      platform: prev.platform || defaultDraftPlatform,
    }))
  }, [data])

  useEffect(() => {
    if (!focusedPanel && !planningToDelete && !platformToDelete && !videoToDelete && !todoToDelete)
      return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [focusedPanel, planningToDelete, platformToDelete, videoToDelete, todoToDelete])

  const filteredPlanning = planningData
    .filter((item) => platform === 'all' || item.platform === platform)
    .filter((item) => isInPeriod(item.publishAt, period))

  const filteredVideos = useMemo(() => {
    const filtered = videoData
      .filter((item) => platform === 'all' || item.platform === platform)
      .filter((item) => isInPeriod(item.deadline, period))
    const globalOrder = [...videoData].sort(compareVideosBySort).map((v) => v.id)
    const index = new Map(globalOrder.map((id, i) => [id, i]))
    return filtered.sort((a, b) => (index.get(a.id) ?? 0) - (index.get(b.id) ?? 0))
  }, [videoData, platform, period])

  const handleVideoReorderDrop = async (event: React.DragEvent, targetVideoId: string) => {
    event.preventDefault()
    event.stopPropagation()
    setDragOverVideoId(null)
    const plain = event.dataTransfer.getData('text/plain')
    let draggedId = event.dataTransfer.getData('videoItemId')
    if (!draggedId && plain.startsWith(DND_VIDEO_PLAIN_PREFIX)) {
      draggedId = plain.slice(DND_VIDEO_PLAIN_PREFIX.length)
    }
    if (!draggedId && draggingVideoIdRef.current) {
      draggedId = draggingVideoIdRef.current
    }
    if (!draggedId || draggedId === targetVideoId || !user) return
    const filteredIds = filteredVideos.map((v) => v.id)
    const filteredSet = new Set(filteredIds)
    if (!filteredSet.has(draggedId) || !filteredSet.has(targetVideoId)) return
    const globalIds = [...videoData].sort(compareVideosBySort).map((v) => v.id)
    const without = filteredIds.filter((id) => id !== draggedId)
    const insertAt = without.indexOf(targetVideoId)
    if (insertAt === -1) return
    const newFilteredOrder = [...without.slice(0, insertAt), draggedId, ...without.slice(insertAt)]
    const merged = mergeFilteredReorderIntoGlobal(globalIds, filteredSet, newFilteredOrder)
    const snapshot = videoData.map((v) => ({ ...v }))
    const sortUpdates = new Map(merged.map((id, i) => [id, i]))
    setVideoData((prev) =>
      prev.map((v) => {
        const idx = sortUpdates.get(v.id)
        return idx !== undefined ? { ...v, sortOrder: idx } : v
      }),
    )
    try {
      await Promise.all(merged.map((id, i) => updateVideoItem(id, { sortOrder: i })))
    } catch (error) {
      console.error(error)
      setVideoData(snapshot)
    }
  }

  const filteredBoard = todoBoard
    .filter((item) => platform === 'all' || item.platform === platform)

  const platformChoicesForForms = useMemo(
    () => (platforms.length > 0 ? platforms : [NO_PLATFORM_LABEL]),
    [platforms],
  )

  const platformsForBanner = useMemo(() => {
    const fromItems = [
      ...planningData.map((i) => i.platform),
      ...videoData.map((i) => i.platform),
      ...todoBoard.map((t) => t.platform),
    ]
    return Array.from(new Set([...platforms, ...fromItems]))
  }, [platforms, planningData, videoData, todoBoard])

  const isPlanningDraftValid = useMemo(
    () =>
      Boolean(
        planningDraft.title.trim() &&
          planningDraft.platform &&
          planningDraft.publishAt,
      ),
    [planningDraft.title, planningDraft.platform, planningDraft.publishAt],
  )

  const isVideoDraftValid = useMemo(
    () =>
      Boolean(
        videoDraft.title.trim() &&
          videoDraft.deadline &&
          videoDraft.platform &&
          videoDraft.platform !== NO_PLATFORM_LABEL,
      ),
    [videoDraft.title, videoDraft.deadline, videoDraft.platform],
  )

  const isTodoDraftValid = useMemo(
    () =>
      Boolean(
        todoDraft.label.trim() &&
          todoDraft.platform &&
          todoDraft.platform !== NO_PLATFORM_LABEL,
      ),
    [todoDraft.label, todoDraft.platform],
  )

  const searchSuggestions = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return []

    // 1. Collecter tous les candidats bruts (sans dédup)
    const candidates: SuggestionItem[] = []

    const push = (item: SuggestionItem) => candidates.push(item)

    push({ label: t('dashboard.searchKwPlanning'), panel: 'planning', targetId: null })
    push({ label: t('dashboard.searchKwAgenda'), panel: 'planning', targetId: null })
    push({ label: t('dashboard.searchKwVideoTracking'), panel: 'videos', targetId: null })
    push({ label: t('dashboard.searchKwVideosShort'), panel: 'videos', targetId: null })
    push({ label: t('dashboard.searchKwTodoList'), panel: 'todo', targetId: null })
    push({ label: t('dashboard.searchKwTodoListAlt'), panel: 'todo', targetId: null })
    push({ label: t('dashboard.searchKwTasks'), panel: 'todo', targetId: null })
    push({ label: t('dashboard.searchKwPlatforms'), panel: 'planning', targetId: null })
    push({ label: t('dashboard.searchKwStats'), panel: 'planning', targetId: null })

    for (const item of planningData) {
      const targetId = toSearchTargetId('planning', item.id)
      push({
        label: item.title,
        panel: 'planning',
        targetId,
        detail: statusLabels[item.status] ?? item.status,
      })
      push({
        label: item.platform,
        panel: 'planning',
        targetId,
        detail: statusLabels[item.status] ?? item.status,
      })
      push({ label: item.status, panel: 'planning', targetId })
    }
    for (const item of videoData) {
      const targetId = toSearchTargetId('video', item.id)
      push({
        label: item.title,
        panel: 'videos',
        targetId,
        detail: stageLabels[item.stage] ?? item.stage,
      })
      push({
        label: item.platform,
        panel: 'videos',
        targetId,
        detail: stageLabels[item.stage] ?? item.stage,
      })
      push({ label: item.stage, panel: 'videos', targetId })
    }
    for (const item of todoBoard) {
      const targetId = toSearchTargetId('todo', item.id)
      push({
        label: item.label,
        panel: 'todo',
        targetId,
        detail: columnLabels[item.column] ?? item.column,
      })
      push({
        label: item.platform,
        panel: 'todo',
        targetId,
        detail: columnLabels[item.column] ?? item.column,
      })
      push({ label: item.priority, panel: 'todo', targetId })
    }
    for (const item of platformsForBanner) {
      push({ label: item, panel: 'planning', targetId: toSearchTargetId('platform', item) })
    }

    // 2. Filtrer par query sur les candidats bruts (avant dédup)
    const normQuery = normalizeText(query)
    const matching = candidates.filter((s) => normalizeText(s.label).includes(normQuery))

    // 3. Calculer doublons sur les candidats filtrés (tous, avant dédup)
    const labelPanels = new Map<string, Set<PanelId>>()
    const labelCount = new Map<string, number>()
    const seen = new Set<string>() // clé unique par (label, panel, targetId)
    for (const s of matching) {
      const dedupeKey = `${normalizeText(s.label)}|${s.panel}|${s.targetId ?? 'section'}`
      if (seen.has(dedupeKey)) continue
      seen.add(dedupeKey)
      const norm = normalizeText(s.label)
      labelCount.set(norm, (labelCount.get(norm) ?? 0) + 1)
      if (!labelPanels.has(norm)) labelPanels.set(norm, new Set())
      labelPanels.get(norm)!.add(s.panel)
    }

    // 4. Dédupliquer et enrichir le label si ambigu
    const pool = new Map<string, SuggestionItem>()
    for (const s of matching) {
      const dedupeKey = `${normalizeText(s.label)}|${s.panel}|${s.targetId ?? 'section'}`
      if (pool.has(dedupeKey)) continue

      const norm = normalizeText(s.label)
      const count = labelCount.get(norm) ?? 1

      if (count <= 1) {
        pool.set(dedupeKey, s)
        continue
      }

      const panels = labelPanels.get(norm)!
      const panelLabel = panelLabels[s.panel]
      const rawLabel = s.label

      const enrichedLabel =
        panels.size > 1
          ? `${rawLabel} — ${panelLabel}`
          : `${rawLabel} — ${panelLabel}${s.detail ? ` — ${s.detail}` : ''}`

      // On remplace label par le texte enrichi et on garde searchTerm pour setSearch
      pool.set(dedupeKey, { ...s, label: enrichedLabel, searchTerm: rawLabel })
    }

    return Array.from(pool.values()).slice(0, 8)
  }, [
    planningData,
    videoData,
    todoBoard,
    platformsForBanner,
    search,
    t,
    panelLabels,
    columnLabels,
    stageLabels,
    statusLabels,
  ])

  const ratio = filteredPlanning.length / Math.max(1, planningData.length)
  const periodWeight = period === '7d' ? 0.35 : period === '30d' ? 1 : period === '90d' ? 1.35 : 1.7
  const totalViews = Math.round((data?.stats.totalViews ?? 0) * periodWeight * Math.max(0.35, ratio))
  const engagement = Number(((data?.stats.engagementRate ?? 0) * Math.max(0.8, ratio)).toFixed(1))
  const publishedCount = filteredPlanning.filter(
    (item) => item.status === 'published' || item.status === 'scheduled',
  ).length

  const displayedMonthLabel = useMemo(
    () => toMonthLabel(displayedMonthStart, localeTag),
    [displayedMonthStart, localeTag],
  )

  const goToPreviousMonth = () => {
    setDisplayedMonthStart(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1),
    )
  }

  const goToNextMonth = () => {
    setDisplayedMonthStart(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1),
    )
  }

  const dateSlots = useMemo(() => {
    const year = displayedMonthStart.getFullYear()
    const month = displayedMonthStart.getMonth()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    return Array.from({ length: daysInMonth }, (_, index) => {
      const slot = new Date(year, month, index + 1)
      const key = toDateKey(slot)
      return { key, label: formatDateLabel(key, localeTag) }
    })
  }, [displayedMonthStart, localeTag])

  const planningByDate = useMemo(() => {
    const map = new Map<string, PlanningItem[]>()
    for (const slot of dateSlots) {
      map.set(slot.key, planningData.filter((item) => toDateKey(item.publishAt) === slot.key))
    }
    return map
  }, [dateSlots, planningData])

  const handlePlanningDragStart = (event: React.DragEvent, itemId: string) => {
    event.stopPropagation()
    event.dataTransfer.setData('text/plain', `${DND_PLANNING_PLAIN_PREFIX}${itemId}`)
    event.dataTransfer.setData('planningItemId', itemId)
    event.dataTransfer.effectAllowed = 'move'
    setDraggingPlanningId(itemId)
  }

  const handlePlanningDragEnd = () => {
    setDraggingPlanningId(null)
    setDragOverDateKey(null)
  }

  const handleVideoDragStart = (event: React.DragEvent, itemId: string) => {
    event.stopPropagation()
    event.dataTransfer.setData('text/plain', `${DND_VIDEO_PLAIN_PREFIX}${itemId}`)
    event.dataTransfer.setData('videoItemId', itemId)
    event.dataTransfer.effectAllowed = 'move'
    draggingVideoIdRef.current = itemId
    setDraggingVideoId(itemId)
  }

  const handleVideoDragEnd = () => {
    draggingVideoIdRef.current = null
    setDraggingVideoId(null)
    setDragOverVideoId(null)
    setDragOverDateKey(null)
  }

  const handleDateDragOver = (event: React.DragEvent, dateKey: string) => {
    event.preventDefault()
    event.stopPropagation()
    event.dataTransfer.dropEffect = 'move'
    setDragOverDateKey(dateKey)
  }

  const handleDateDragLeave = (event: React.DragEvent) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node)) {
      setDragOverDateKey(null)
    }
  }

  const handleDateDrop = async (event: React.DragEvent, dateKey: string) => {
    event.preventDefault()
    event.stopPropagation()
    const plain = event.dataTransfer.getData('text/plain')
    let videoId = event.dataTransfer.getData('videoItemId')
    if (!videoId && plain.startsWith(DND_VIDEO_PLAIN_PREFIX)) {
      videoId = plain.slice(DND_VIDEO_PLAIN_PREFIX.length)
    }
    if (!videoId && draggingVideoIdRef.current) {
      videoId = draggingVideoIdRef.current
    }
    draggingVideoIdRef.current = null
    let planningItemId = event.dataTransfer.getData('planningItemId')
    if (!planningItemId && plain.startsWith(DND_PLANNING_PLAIN_PREFIX)) {
      planningItemId = plain.slice(DND_PLANNING_PLAIN_PREFIX.length)
    }

    if (!user) {
      setDraggingPlanningId(null)
      setDraggingVideoId(null)
      setDragOverDateKey(null)
      return
    }

    if (videoId) {
      const video = videoData.find((v) => v.id === videoId)
      if (!video || toDateKey(video.deadline) === dateKey) {
        setDraggingVideoId(null)
        setDragOverDateKey(null)
        return
      }
      const previousDeadline = video.deadline
      const linkedPlanning = planningData.find((p) => p.videoId === videoId)
      const previousPublishAt = linkedPlanning?.publishAt

      setVideoData((prev) =>
        prev.map((v) => (v.id === videoId ? { ...v, deadline: dateKey } : v)),
      )
      if (linkedPlanning) {
        setPlanningData((prev) =>
          prev.map((p) =>
            p.id === linkedPlanning.id ? { ...p, publishAt: dateKey } : p,
          ),
        )
      }
      setDraggingVideoId(null)
      setDragOverDateKey(null)

      try {
        await updateVideoItem(videoId, { deadline: dateKey })
        if (linkedPlanning) {
          await updatePlanningItem(linkedPlanning.id, { publishAt: dateKey })
        }
      } catch (error) {
        console.error(t('dashboard.dragEventError'), error)
        setVideoData((prev) =>
          prev.map((v) =>
            v.id === videoId ? { ...v, deadline: previousDeadline } : v,
          ),
        )
        if (linkedPlanning && previousPublishAt !== undefined) {
          setPlanningData((prev) =>
            prev.map((p) =>
              p.id === linkedPlanning.id
                ? { ...p, publishAt: previousPublishAt }
                : p,
            ),
          )
        }
      }
      return
    }

    const itemId = planningItemId
    if (!itemId) {
      setDraggingPlanningId(null)
      setDraggingVideoId(null)
      setDragOverDateKey(null)
      return
    }
    const item = planningData.find((p) => p.id === itemId)
    if (!item || toDateKey(item.publishAt) === dateKey) {
      setDraggingPlanningId(null)
      setDragOverDateKey(null)
      return
    }
    setPlanningData((prev) =>
      prev.map((p) => (p.id === itemId ? { ...p, publishAt: dateKey } : p)),
    )
    setDraggingPlanningId(null)
    setDragOverDateKey(null)
    const previousPublishAt = item.publishAt
    try {
      await updatePlanningItem(itemId, { publishAt: dateKey })
      if (item.videoId) {
        try {
          await updateVideoItem(item.videoId, { deadline: dateKey })
          setVideoData((prev) =>
            prev.map((v) =>
              v.id === item.videoId ? { ...v, deadline: dateKey } : v,
            ),
          )
        } catch (videoError) {
          console.error(videoError)
          await updatePlanningItem(itemId, { publishAt: previousPublishAt })
          setPlanningData((prev) =>
            prev.map((p) =>
              p.id === itemId ? { ...p, publishAt: previousPublishAt } : p,
            ),
          )
        }
      }
    } catch (error) {
      console.error(t('dashboard.dragEventError'), error)
      setPlanningData((prev) =>
        prev.map((p) => (p.id === itemId ? { ...p, publishAt: item.publishAt } : p)),
      )
    }
  }

  const setTaskLabel = (id: string, label: string) => {
    setTodoBoard((prev) => prev.map((task) => (task.id === id ? { ...task, label } : task)))
  }

  const setTaskDraftChecklist = (id: string, value: string) => {
    setTodoBoard((prev) =>
      prev.map((task) => (task.id === id ? { ...task, newChecklistText: value } : task)),
    )
  }

  const addChecklistItem = (id: string) => {
    setTodoBoard((prev) =>
      prev.map((task) => {
        if (task.id !== id) return task
        const text = task.newChecklistText.trim()
        if (!text) return task
        return {
          ...task,
          checklist: [...task.checklist, { id: `${task.id}-${Date.now()}`, text, done: false }],
          newChecklistText: '',
        }
      }),
    )
  }

  const toggleChecklistItem = (taskId: string, checklistId: string) => {
    setTodoBoard((prev) =>
      prev.map((task) =>
        task.id === taskId
          ? {
              ...task,
              checklist: task.checklist.map((item) =>
                item.id === checklistId ? { ...item, done: !item.done } : item,
              ),
            }
          : task,
      ),
    )
  }

  const moveTask = (id: string, target: TodoColumn) => {
    setTodoBoard((prev) =>
      prev.map((task) => (task.id === id ? { ...task, column: target } : task)),
    )
    updateTodoItem(id, { column: target }).catch(console.error)
  }

  const setTodoDraftField = <K extends keyof TodoDraft>(key: K, value: TodoDraft[K]) => {
    setTodoDraft((prev) => ({ ...prev, [key]: value }))
  }

  const resetTodoDraft = () => {
    setTodoDraft({
      label: '',
      platform: platforms[0] ?? NO_PLATFORM_LABEL,
      priority: 'medium',
      column: 'todo',
    })
    setEditingTodoId(null)
  }

  const submitTodoDraft = async () => {
    if (
      !todoDraft.label.trim() ||
      !todoDraft.platform ||
      todoDraft.platform === NO_PLATFORM_LABEL
    )
      return
    setSearch('')
    if (platform !== 'all' && platform !== todoDraft.platform) {
      setPlatform(todoDraft.platform)
    }

    if (editingTodoId) {
      setTodoBoard((prev) =>
        prev.map((task) =>
          task.id === editingTodoId
            ? {
                ...task,
                label: todoDraft.label.trim(),
                platform: todoDraft.platform,
                priority: todoDraft.priority,
                column: todoDraft.column,
              }
            : task,
        ),
      )
      updateTodoItem(editingTodoId, {
        label: todoDraft.label.trim(),
        platform: todoDraft.platform,
        priority: todoDraft.priority,
        column: todoDraft.column,
      }).catch(console.error)
      resetTodoDraft()
      setIsTodoFormOpen(false)
      return
    }

    if (!user?.id) return
    try {
      const created = await addTodoItem(user.id, {
        label: todoDraft.label.trim(),
        platform: todoDraft.platform,
        priority: todoDraft.priority,
        column: todoDraft.column,
      })
      addUserPlatform(user.id, created.platform).catch(console.error)
      const newTask: BoardTask = {
        id: created.id,
        label: created.label,
        platform: created.platform,
        priority: created.priority,
        column: created.column,
        checklist: [],
        newChecklistText: '',
      }
      setTodoBoard((prev) => [...prev, newTask])
    } catch (error) {
      console.error(error)
    }
    resetTodoDraft()
    setIsTodoFormOpen(false)
  }

  const startTodoEdit = (task: BoardTask) => {
    setFocusedPanel('todo')
    setIsTodoFormOpen(true)
    setEditingTodoId(task.id)
    setTodoDraft({
      label: task.label,
      platform: task.platform,
      priority: task.priority,
      column: task.column,
    })
  }

  const deleteTodoItem = (id: string) => {
    setTodoBoard((prev) => prev.filter((task) => task.id !== id))
    if (editingTodoId === id) {
      resetTodoDraft()
    }
    deleteTodoItemApi(id).catch(console.error)
  }

  const askTodoDelete = (task: BoardTask) => {
    setTodoToDelete(task)
  }

  const cancelTodoDelete = () => {
    setTodoToDelete(null)
  }

  const confirmTodoDelete = () => {
    if (!todoToDelete) return
    deleteTodoItem(todoToDelete.id)
    setTodoToDelete(null)
  }

  const handleTaskDragStart = (event: React.DragEvent, taskId: string) => {
    event.dataTransfer.setData('text/plain', `${DND_TASK_PLAIN_PREFIX}${taskId}`)
    event.dataTransfer.effectAllowed = 'move'
    draggingTaskIdRef.current = taskId
    setDraggingTaskId(taskId)
  }

  const handleTaskDragEnd = () => {
    draggingTaskIdRef.current = null
    setDraggingTaskId(null)
    setDragOverColumn(null)
  }

  const handleColumnDragOver = (event: DragEvent<HTMLDivElement>, column: TodoColumn) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    setDragOverColumn(column)
  }

  const handleColumnDrop = (event: React.DragEvent, column: TodoColumn) => {
    event.preventDefault()
    event.stopPropagation()
    const plain = event.dataTransfer.getData('text/plain')
    let taskId = draggingTaskIdRef.current
    if (!taskId && plain.startsWith(DND_TASK_PLAIN_PREFIX)) {
      taskId = plain.slice(DND_TASK_PLAIN_PREFIX.length)
    }
    if (taskId) {
      moveTask(taskId, column)
    }
    draggingTaskIdRef.current = null
    setDraggingTaskId(null)
    setDragOverColumn(null)
  }

  const handleTaskTouchStart = (taskId: string) => {
    setTouchDragTaskId(taskId)
  }

  const handleTaskTouchMove = (event: TouchEvent<HTMLDivElement>) => {
    if (!touchDragTaskId) return
    const touch = event.touches[0]
    if (!touch) return
    const element = document.elementFromPoint(touch.clientX, touch.clientY)
    const column = element
      ?.closest('[data-kanban-column]')
      ?.getAttribute('data-kanban-column') as TodoColumn | null
    if (column === 'todo' || column === 'doing' || column === 'done') {
      setTouchOverColumn(column)
    }
  }

  const handleTaskTouchEnd = () => {
    if (touchDragTaskId && touchOverColumn) {
      moveTask(touchDragTaskId, touchOverColumn)
    }
    setTouchDragTaskId(null)
    setTouchOverColumn(null)
  }

  const setVideoStage = (id: string, nextStage: VideoStage) => {
    setVideoStages((prev) => ({ ...prev, [id]: nextStage }))
    setVideoData((prev) => prev.map((item) => (item.id === id ? { ...item, stage: nextStage } : item)))
    updateVideoItem(id, { stage: nextStage }).catch(console.error)
  }

  const setVideoDraftField = <K extends keyof VideoDraft>(key: K, value: VideoDraft[K]) => {
    setVideoDraft((prev) => ({ ...prev, [key]: value }))
  }

  const resetVideoDraft = () => {
    setVideoDraft({
      title: '',
      platform: platforms[0] ?? NO_PLATFORM_LABEL,
      deadline: '',
      stage: 'idea',
    })
    setEditingVideoId(null)
  }

  const submitVideoDraft = async () => {
    if (
      !videoDraft.title.trim() ||
      !videoDraft.platform ||
      videoDraft.platform === NO_PLATFORM_LABEL ||
      !videoDraft.deadline
    )
      return
    const normalizedDate = toDateKey(videoDraft.deadline)
    const ensureVisibility = (eventPlatform: string, eventDate: string) => {
      setSearch('')
      if (platform !== 'all' && platform !== eventPlatform) {
        setPlatform(eventPlatform)
      }
      if (!isInPeriod(eventDate, period)) {
        setPeriod('all')
      }
    }

    if (editingVideoId) {
      const linkedPlanning = planningData.find((p) => p.videoId === editingVideoId)
      try {
        await updateVideoItem(editingVideoId, {
          title: videoDraft.title.trim(),
          platform: videoDraft.platform,
          deadline: normalizedDate,
          stage: videoDraft.stage,
        })
        if (linkedPlanning) {
          await updatePlanningItem(linkedPlanning.id, {
            title: videoDraft.title.trim(),
            platform: videoDraft.platform,
            publishAt: normalizedDate,
          })
        }
        setVideoData((prev) =>
          prev.map((item) =>
            item.id === editingVideoId
              ? {
                  ...item,
                  title: videoDraft.title.trim(),
                  platform: videoDraft.platform,
                  deadline: normalizedDate,
                  stage: videoDraft.stage,
                }
              : item,
          ),
        )
        setVideoStages((prev) => ({ ...prev, [editingVideoId]: videoDraft.stage }))
        if (linkedPlanning) {
          setPlanningData((prev) =>
            prev.map((p) =>
              p.id === linkedPlanning.id
                ? {
                    ...p,
                    title: videoDraft.title.trim(),
                    platform: videoDraft.platform,
                    publishAt: normalizedDate,
                  }
                : p,
            ),
          )
        }
      } catch (error) {
        console.error(error)
      }
      ensureVisibility(videoDraft.platform, normalizedDate)
      resetVideoDraft()
      setIsVideoFormOpen(false)
      return
    }

    if (!user?.id) return
    try {
      const maxSort = videoData.reduce((m, v) => Math.max(m, v.sortOrder ?? 0), -1)
      const newVideo = await addVideoItem(user.id, {
        title: videoDraft.title.trim(),
        platform: videoDraft.platform,
        deadline: normalizedDate,
        stage: videoDraft.stage,
        sortOrder: maxSort + 1,
      })
      addUserPlatform(user.id, newVideo.platform).catch(console.error)
      setVideoData((prev) => [...prev, newVideo])
      setVideoStages((prev) => ({ ...prev, [newVideo.id]: newVideo.stage }))
      ensureVisibility(newVideo.platform, newVideo.deadline)
      try {
        const newPlanning = await addPlanningItem(user.id, {
          title: newVideo.title,
          platform: newVideo.platform,
          publishAt: newVideo.deadline,
          status: 'scheduled',
          videoId: newVideo.id,
        })
        setPlanningData((prev) => [...prev, newPlanning])
      } catch (planningError) {
        console.error(planningError)
      }
    } catch (error) {
      console.error(error)
    }
    resetVideoDraft()
    setIsVideoFormOpen(false)
  }

  const startVideoEdit = (item: VideoItem) => {
    setFocusedPanel('videos')
    setIsVideoFormOpen(true)
    setEditingVideoId(item.id)
    setVideoDraft({
      title: item.title,
      platform: item.platform,
      deadline: toDateKey(item.deadline),
      stage: videoStages[item.id] ?? item.stage,
    })
  }

  const deleteVideoItem = (id: string) => {
    setVideoData((prev) => prev.filter((item) => item.id !== id))
    setVideoStages((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
    if (editingVideoId === id) {
      resetVideoDraft()
    }
    deleteVideoItemApi(id).catch(console.error)
  }

  const askVideoDelete = (item: VideoItem) => {
    setVideoToDelete(item)
  }

  const cancelVideoDelete = () => {
    setVideoToDelete(null)
  }

  const confirmVideoDelete = () => {
    if (!videoToDelete) return
    deleteVideoItem(videoToDelete.id)
    setVideoToDelete(null)
  }

  const createPlatform = () => {
    const next = newPlatformName.trim().toLowerCase()
    if (!next || platforms.includes(next) || next === NO_PLATFORM_LABEL) return
    setPlatforms((prev) => [...prev, next])
    setNewPlatformName('')
    setIsAddingPlatform(false)
    if (user?.id) addUserPlatform(user.id, next).catch(console.error)
  }

  const renamePlatform = (from: string, draftName: string) => {
    if (from === NO_PLATFORM_LABEL) return
    const to = draftName.trim().toLowerCase()
    if (!to || to === from || platforms.includes(to) || to === NO_PLATFORM_LABEL) return
    setPlatforms((prev) => prev.map((item) => (item === from ? to : item)))
    setPlanningData((prev) => prev.map((item) => (item.platform === from ? { ...item, platform: to } : item)))
    setVideoData((prev) => prev.map((item) => (item.platform === from ? { ...item, platform: to } : item)))
    setTodoBoard((prev) => prev.map((item) => (item.platform === from ? { ...item, platform: to } : item)))
    if (platform === from) setPlatform(to)
    setEditingPlatformName(null)
    setEditingPlatformValue('')
    if (user?.id) {
      Promise.all([
        renameUserPlatform(user.id, from, to),
        renamePlatformInPlanning(user.id, from, to),
        renamePlatformInVideos(user.id, from, to),
        renamePlatformInTodos(user.id, from, to),
      ]).catch(console.error)
    }
  }

  const deletePlatform = (name: string) => {
    if (!platforms.includes(name) || name === NO_PLATFORM_LABEL) return
    const remaining = platforms.filter((item) => item !== name)
    const fallback = remaining[0] ?? NO_PLATFORM_LABEL
    setPlatforms(remaining)
    setPlanningData((prev) =>
      prev.map((item) => (item.platform === name ? { ...item, platform: fallback } : item)),
    )
    setVideoData((prev) =>
      prev.map((item) => (item.platform === name ? { ...item, platform: fallback } : item)),
    )
    setTodoBoard((prev) =>
      prev.map((item) => (item.platform === name ? { ...item, platform: fallback } : item)),
    )
    if (platform === name) setPlatform('all')
    if (editingPlatformName === name) {
      setEditingPlatformName(null)
      setEditingPlatformValue('')
    }
    if (user?.id) {
      Promise.all([
        deleteUserPlatform(user.id, name),
        deletePlatformInPlanning(user.id, name, fallback),
        deletePlatformInVideos(user.id, name, fallback),
        deletePlatformInTodos(user.id, name, fallback),
      ]).catch(console.error)
    }
  }

  const startPlatformEdit = (name: string) => {
    setEditingPlatformName(name)
    setEditingPlatformValue(name)
  }

  const cancelPlatformEdit = () => {
    setEditingPlatformName(null)
    setEditingPlatformValue('')
  }

  const askPlatformDelete = (name: string) => {
    setPlatformToDelete(name)
  }

  const cancelPlatformDelete = () => {
    setPlatformToDelete(null)
  }

  const confirmPlatformDelete = () => {
    if (!platformToDelete) return
    deletePlatform(platformToDelete)
    setPlatformToDelete(null)
  }

  const setPlanningDraftField = <K extends keyof PlanningDraft>(
    key: K,
    value: PlanningDraft[K],
  ) => {
    setPlanningDraft((prev) => ({ ...prev, [key]: value }))
  }

  const resetPlanningDraft = () => {
    setPlanningDraft({
      title: '',
      platform: platforms[0] ?? NO_PLATFORM_LABEL,
      publishAt: '',
      status: 'draft',
    })
    setEditingPlanningId(null)
  }

  const submitPlanningDraft = async () => {
    if (!planningDraft.title.trim() || !planningDraft.platform || !planningDraft.publishAt) return
    const normalizedDate = toDateKey(planningDraft.publishAt)
    const ensureVisibility = (eventPlatform: string, eventDate: string) => {
      const eventDateObj = parseDateSafe(eventDate)
      setDisplayedMonthStart(new Date(eventDateObj.getFullYear(), eventDateObj.getMonth(), 1))
      setSearch('')
      if (platform !== 'all' && platform !== eventPlatform) {
        setPlatform(eventPlatform)
      }
      if (!isInPeriod(eventDate, period)) {
        setPeriod('all')
      }
    }

    if (editingPlanningId) {
      const editingItem = planningData.find((p) => p.id === editingPlanningId)
      try {
        await updatePlanningItem(editingPlanningId, {
          title: planningDraft.title.trim(),
          platform: planningDraft.platform,
          publishAt: normalizedDate,
          status: planningDraft.status,
        })
        if (editingItem?.videoId) {
          await updateVideoItem(editingItem.videoId, {
            title: planningDraft.title.trim(),
            platform: planningDraft.platform,
            deadline: normalizedDate,
          })
        }
        setPlanningData((prev) =>
          prev.map((item) =>
            item.id === editingPlanningId
              ? {
                  ...item,
                  title: planningDraft.title.trim(),
                  platform: planningDraft.platform,
                  publishAt: normalizedDate,
                  status: planningDraft.status,
                }
              : item,
          ),
        )
        if (editingItem?.videoId) {
          setVideoData((prev) =>
            prev.map((v) =>
              v.id === editingItem.videoId
                ? {
                    ...v,
                    title: planningDraft.title.trim(),
                    platform: planningDraft.platform,
                    deadline: normalizedDate,
                  }
                : v,
            ),
          )
        }
      } catch (error) {
        console.error(error)
      }
      ensureVisibility(planningDraft.platform, normalizedDate)
      resetPlanningDraft()
      setIsPlanningFormOpen(false)
      return
    }

    if (!user?.id) return
    try {
      const newItem = await addPlanningItem(user.id, {
        title: planningDraft.title.trim(),
        platform: planningDraft.platform,
        publishAt: normalizedDate,
        status: planningDraft.status,
      })
      addUserPlatform(user.id, newItem.platform).catch(console.error)
      setPlanningData((prev) => [...prev, newItem])
      ensureVisibility(newItem.platform, newItem.publishAt)
    } catch (error) {
      console.error(error)
    }
    resetPlanningDraft()
    setIsPlanningFormOpen(false)
  }

  const startPlanningEdit = (item: PlanningItem) => {
    setFocusedPanel('planning')
    setIsPlanningFormOpen(true)
    setEditingPlanningId(item.id)
    setPlanningDraft({
      title: item.title,
      platform: item.platform,
      publishAt: toDateKey(item.publishAt),
      status: item.status,
    })
  }

  const deletePlanningItem = (id: string) => {
    setPlanningData((prev) => prev.filter((item) => item.id !== id))
    if (editingPlanningId === id) {
      resetPlanningDraft()
    }
    deletePlanningItemApi(id).catch(console.error)
  }

  const askPlanningDelete = (item: PlanningItem) => {
    setPlanningToDelete(item)
  }

  const cancelPlanningDelete = () => {
    setPlanningToDelete(null)
  }

  const confirmPlanningDelete = () => {
    if (!planningToDelete) return
    deletePlanningItem(planningToDelete.id)
    setPlanningToDelete(null)
  }

  const closeFocusedPanel = () => {
    setFocusedPanel(null)
    resetPlanningDraft()
    setIsPlanningFormOpen(false)
    resetVideoDraft()
    setIsVideoFormOpen(false)
    resetTodoDraft()
    setIsTodoFormOpen(false)
  }

  const toggleFocusedPanel = (panel: PanelId) => {
    if (focusedPanel === panel) {
      closeFocusedPanel()
    } else {
      setFocusedPanel(panel)
    }
  }

  const togglePanelCollapsed = (panel: PanelId) => {
    setCollapsedPanels((prev) => ({ ...prev, [panel]: !prev[panel] }))
  }

  const goToAccount = () => {
    setFocusedPanel(null)
    navigate('/account')
  }

  const panelOrderIndex = useMemo(
    () => ({
      planning: panelOrder.indexOf('planning'),
      videos: panelOrder.indexOf('videos'),
      todo: panelOrder.indexOf('todo'),
      chart: panelOrder.indexOf('chart'),
    }),
    [panelOrder],
  )

  const isLastPanelSingle = panelOrder.length % 2 === 1
  const lastPanel = panelOrder[panelOrder.length - 1]

  const chartData = useMemo(() => {
    const safeTotalViews = Math.max(1, totalViews)
    return dateSlots.map((slot, index) => {
      const planningItemsForDay = filteredPlanning.filter((item) => toDateKey(item.publishAt) === slot.key).length
      const videosForDay = filteredVideos.filter((item) => toDateKey(item.deadline) === slot.key).length
      const publishedForDay = filteredPlanning.filter(
        (item) =>
          toDateKey(item.publishAt) === slot.key &&
          (item.status === 'published' || item.status === 'scheduled'),
      ).length
      const dayFactor = (index + 1) / Math.max(1, dateSlots.length)
      const vues = Math.round(
        safeTotalViews / Math.max(1, dateSlots.length) +
          planningItemsForDay * 120 +
          videosForDay * 80 +
          dayFactor * 40,
      )
      const engagementJour = Number(
        Math.min(100, Math.max(0, engagement * 0.85 + videosForDay * 1.8 + planningItemsForDay * 0.7)).toFixed(1),
      )
      return {
        label: formatDateLabel(slot.key, localeTag),
        vues,
        engagement: engagementJour,
        publies: publishedForDay,
      }
    })
  }, [dateSlots, filteredPlanning, filteredVideos, totalViews, engagement, localeTag])

  const handlePanelDragStart = (event: React.DragEvent, panel: PanelId) => {
    event.dataTransfer.setData('text/plain', `${DND_PANEL_PLAIN_PREFIX}${panel}`)
    event.dataTransfer.effectAllowed = 'move'
    draggingPanelRef.current = panel
    setDraggingPanel(panel)
  }

  const handlePanelDragOver = (event: DragEvent<HTMLElement>, panel: PanelId) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    setDragOverPanel(panel)
  }

  const handlePanelDrop = (event: React.DragEvent, target: PanelId) => {
    event.preventDefault()
    event.stopPropagation()
    const plain = event.dataTransfer.getData('text/plain')
    let source = draggingPanelRef.current
    if (!source && plain.startsWith(DND_PANEL_PLAIN_PREFIX)) {
      const id = plain.slice(DND_PANEL_PLAIN_PREFIX.length)
      if (isPanelId(id)) source = id
    }
    if (!source || source === target) {
      draggingPanelRef.current = null
      setDraggingPanel(null)
      setDragOverPanel(null)
      return
    }
    setPanelOrder((prev) => {
      const next = [...prev]
      const fromIndex = next.indexOf(source)
      const targetIndex = next.indexOf(target)
      if (fromIndex < 0 || targetIndex < 0) return prev
      next.splice(fromIndex, 1)
      next.splice(targetIndex, 0, source)
      return next
    })
    draggingPanelRef.current = null
    setDraggingPanel(null)
    setDragOverPanel(null)
  }

  const handlePanelDragEnd = () => {
    draggingPanelRef.current = null
    setDraggingPanel(null)
    setDragOverPanel(null)
  }

  const focusPanelFromSuggestion = (suggestion: SuggestionItem) => {
    const { panel, targetId } = suggestion
    if (targetId) {
      const target = document.querySelector<HTMLElement>(`[data-search-id="${targetId}"]`)
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' })
        setHighlightedItemId(targetId)
        window.setTimeout(() => {
          setHighlightedItemId((current) => (current === targetId ? null : current))
        }, 3600)
        return
      }
    }

    const element = panelCardRefs.current[panel]
    if (!element) return
    element.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setHighlightedPanel(panel)
    window.setTimeout(() => {
      setHighlightedPanel((current) => (current === panel ? null : current))
    }, 3600)
  }

  const renderVideoListItem = (video: VideoItem, stageSelectId: string) => {
    const currentStage = videoStages[video.id] ?? video.stage
    return (
      <li
        key={video.id}
        data-search-id={toSearchTargetId('video', video.id)}
        data-video-id={video.id}
        onDragOver={(e) => {
          e.preventDefault()
          e.stopPropagation()
          if (draggingVideoId && draggingVideoId !== video.id) {
            e.dataTransfer.dropEffect = 'move'
            setDragOverVideoId(video.id)
          }
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setDragOverVideoId(null)
          }
        }}
        onDrop={(e) => {
          void handleVideoReorderDrop(e, video.id)
        }}
        className={`${
          highlightedItemId === toSearchTargetId('video', video.id) ? styles.itemPulse : ''
        } ${draggingVideoId === video.id ? styles.videoRowDragging : ''} ${
          dragOverVideoId === video.id ? styles.videoRowDropTarget : ''
        }`}
      >
        <div className={styles.videoListRow}>
          <details className={styles.videoDetails}>
            <summary className={styles.videoSummary}>
              <HiChevronDown
                className={`${styles.dropdownIcon} ${styles.videoSummaryChevron}`}
                aria-hidden
              />
              <span className={styles.videoSummaryTitle}>
                {highlightMatch(video.title, search)}
              </span>
            </summary>
            <div className={styles.videoDetailsBody}>
              <span className={styles.videoMetaLine}>
                {t('dashboard.labelPlatform')}: {highlightMatch(video.platform, search)} —{' '}
                {t('dashboard.labelDeadline')}: {highlightMatch(video.deadline, search)}
              </span>
              <div className={styles.inlineControls}>
                <label htmlFor={stageSelectId}>{t('dashboard.stageLabel')}</label>
                <span className={`${styles.stageBadge} ${styles[`stage_${currentStage}`]}`}>
                  {stageLabels[currentStage]}
                </span>
                <select
                  id={stageSelectId}
                  value={currentStage}
                  onChange={(event) =>
                    setVideoStage(video.id, event.target.value as VideoStage)
                  }
                >
                  <option value="idea">{stageLabels.idea}</option>
                  <option value="scripting">{stageLabels.scripting}</option>
                  <option value="recording">{stageLabels.recording}</option>
                  <option value="editing">{stageLabels.editing}</option>
                  <option value="published">{stageLabels.published}</option>
                </select>
                <div className={styles.videoItemActions}>
                  <button
                    type="button"
                    className={styles.iconActionButton}
                    data-tooltip={t('dashboard.edit')}
                    aria-label={t('dashboard.editVideo')}
                    onClick={() => startVideoEdit(video)}
                  >
                    <AiOutlineEdit aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className={`${styles.iconActionButton} ${styles.deleteAction}`}
                    data-tooltip={t('dashboard.delete')}
                    aria-label={t('dashboard.deleteVideoAria')}
                    onClick={() => askVideoDelete(video)}
                  >
                    <AiOutlineDelete aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          </details>
          <span
            className={styles.videoDragHandle}
            draggable
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            onDragStart={(event) => handleVideoDragStart(event, video.id)}
            onDragEnd={handleVideoDragEnd}
            title={`${t('dashboard.dragVideoToAgenda')} — ${t('dashboard.dragVideoReorderList')}`}
            aria-label={t('dashboard.dragVideoHandle')}
          >
            <HiBars3 aria-hidden />
          </span>
        </div>
      </li>
    )
  }

  if (isLoading)
    return <div className={styles.feedback}>{t('dashboard.loading')}</div>
  if (isError || !data)
    return <div className={styles.feedback}>{t('dashboard.loadError')}</div>

  return (
    <CreatorAppShell
      topBarTrailing={
        <>
          <button
            type="button"
            className={styles.profileButton}
            onClick={goToAccount}
            aria-label={t('shell.goAccount')}
          >
            {avatarDataUrl ? (
              <img
                className={styles.profileAvatarImg}
                src={avatarDataUrl}
                alt=""
              />
            ) : (
              <span className={styles.profileAvatar}>
                {user?.email?.[0]?.toUpperCase() ?? '?'}
              </span>
            )}
          </button>
          <div className={styles.searchBox}>
            <input
              className={styles.searchInput}
              placeholder={t('dashboard.searchPlaceholder')}
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setIsSuggestionsOpen(true)
              }}
              onFocus={() => setIsSuggestionsOpen(true)}
              onBlur={() => setTimeout(() => setIsSuggestionsOpen(false), 120)}
            />
            {isSuggestionsOpen && searchSuggestions.length > 0 ? (
              <div className={styles.searchSuggestions}>
                {searchSuggestions.map((item) => (
                  <button
                    key={`${item.searchTerm ?? item.label}-${item.panel}-${item.targetId ?? 'section'}`}
                    type="button"
                    onClick={() => {
                      setSearch(item.searchTerm ?? item.label)
                      focusPanelFromSuggestion(item)
                      setIsSuggestionsOpen(false)
                    }}
                  >
                    {highlightMatch(item.label, item.searchTerm ?? search)}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </>
      }
    >
        <>
        <section className={styles.banner}>
          <h1>{t('dashboard.title', { suffix: profileTitleSuffix })}</h1>
          <p>{t('dashboard.bannerSubtitle')}</p>
          <div className={styles.bannerActions}>
            {(['7d', '30d', '90d', 'all'] as const).map((item) => (
              <button
                key={item}
                className={`${styles.filterButton} ${
                  period === item ? styles.filterButtonActive : ''
                }`}
                onClick={() => setPeriod(item)}
                type="button"
              >
                {item === 'all' ? 'Tout' : item}
              </button>
            ))}
            <button
              className={`${styles.filterButton} ${platform === 'all' ? styles.filterButtonActive : ''}`}
              onClick={() => setPlatform('all')}
              type="button"
            >
              {t('dashboard.allPlatforms')}
            </button>
            {platformsForBanner
              .filter((p) => p !== NO_PLATFORM_LABEL)
              .map((item) => (
              <div
                key={item}
                data-search-id={toSearchTargetId('platform', item)}
                className={`${styles.platformFilterItem} ${
                  highlightedItemId === toSearchTargetId('platform', item) ? styles.itemPulse : ''
                }`}
              >
                {editingPlatformName === item ? (
                  <>
                    <input
                      className={styles.platformChipInput}
                      value={editingPlatformValue}
                      onChange={(event) => setEditingPlatformValue(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') renamePlatform(item, editingPlatformValue)
                        if (event.key === 'Escape') cancelPlatformEdit()
                      }}
                      autoFocus
                    />
                    <button
                      type="button"
                      className={styles.platformChipAction}
                      aria-label={t('dashboard.validateEdit', { name: item })}
                      onClick={() => renamePlatform(item, editingPlatformValue)}
                    >
                      ✓
                    </button>
                    <button
                      type="button"
                      className={styles.platformChipAction}
                      aria-label={t('dashboard.cancelEdit')}
                      onClick={cancelPlatformEdit}
                    >
                      ×
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className={`${styles.platformChipMain} ${
                        platform === item ? styles.platformChipMainActive : ''
                      }`}
                      onClick={() => setPlatform(item)}
                      type="button"
                    >
                      {item}
                    </button>
                    {!platforms.includes(item) ? null : (
                      <>
                        <button
                          type="button"
                          className={styles.platformChipAction}
                          data-tooltip={t('dashboard.edit')}
                          aria-label={t('dashboard.editPlatformItem', { name: item })}
                          onClick={() => startPlatformEdit(item)}
                        >
                          <AiOutlineEdit aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          className={`${styles.platformChipAction} ${styles.deleteAction}`}
                          data-tooltip={t('dashboard.delete')}
                          aria-label={t('dashboard.deletePlatformItem', { name: item })}
                          onClick={() => askPlatformDelete(item)}
                        >
                          <AiOutlineDelete aria-hidden="true" />
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
            ))}
            {isAddingPlatform ? (
              <div className={styles.inlineAddPlatform}>
                <input
                  value={newPlatformName}
                  onChange={(event) => setNewPlatformName(event.target.value)}
                  placeholder={t('dashboard.platformPlaceholder')}
                />
                <button type="button" onClick={createPlatform}>
                  {t('dashboard.ok')}
                </button>
              </div>
            ) : (
              <button
                type="button"
                className={styles.addPlatformButton}
                aria-label={t('dashboard.addPlatform')}
                onClick={() => setIsAddingPlatform(true)}
              >
                +
              </button>
            )}
          </div>
        </section>

        <h2 className={styles.sectionTitle}>{t('dashboard.panelChart')}</h2>
        <section className={styles.statsGrid}>
          <article className={styles.statCard}>
            <p>{t('dashboard.totalViews')}</p>
            <strong>{formatNumber(totalViews, localeTag)}</strong>
          </article>
          <article className={styles.statCard}>
            <p>{t('dashboard.avgEngagement')}</p>
            <strong>{engagement}%</strong>
          </article>
          <article className={styles.statCard}>
            <p>{t('dashboard.chartPublishedPeriod')}</p>
            <strong>{publishedCount}</strong>
          </article>
        </section>

        <section className={styles.contentGrid}>
          <article
            data-panel-card="planning"
            className={`${styles.panelCard} ${styles.panelPlanning} ${
              highlightedPanel === 'planning' ? styles.panelPulse : ''
            } ${styles.panelCardDraggable} ${
              draggingPanel === 'planning' ? styles.panelCardDragging : ''
            } ${dragOverPanel === 'planning' ? styles.panelCardDropTarget : ''} ${
              isLastPanelSingle && lastPanel === 'planning' ? styles.panelFullWidth : ''
            } ${!collapsedPanels.planning ? styles.panelCardOpen : styles.panelCardCollapsed}`}
            style={{ order: panelOrderIndex.planning }}
            draggable
            onDragStart={(event) => handlePanelDragStart(event, 'planning')}
            onDragOver={(event) => handlePanelDragOver(event, 'planning')}
            onDrop={(event) => handlePanelDrop(event, 'planning')}
            onDragEnd={handlePanelDragEnd}
            ref={(node) => {
              panelCardRefs.current.planning = node
            }}
          >
            <div className={styles.panelContent}>
              <div className={styles.panelHeader}>
                <h3>{t('dashboard.planningTitle')}</h3>
                <div className={styles.calendarHeaderActions}>
                  <button
                    type="button"
                    className={styles.panelExpandButton}
                    onClick={() => togglePanelCollapsed('planning')}
                    aria-label={
                      collapsedPanels.planning
                        ? t('dashboard.expandPlanning')
                        : t('dashboard.collapsePlanning')
                    }
                  >
                    <HiChevronDown
                      className={`${styles.dropdownIcon} ${
                        collapsedPanels.planning ? styles.dropdownChevronCollapsed : ''
                      }`}
                      aria-hidden="true"
                    />
                  </button>
                  <button
                    type="button"
                    className={styles.panelExpandButton}
                    onClick={() => toggleFocusedPanel('planning')}
                    aria-label={t('dashboard.expandPlanningFull')}
                  >
                    ⤢
                  </button>
                </div>
              </div>
              {!collapsedPanels.planning ? (
              <>
              <div className={styles.planningToolbar}>
                <button
                  type="button"
                  className={styles.dropdownTrigger}
                  onClick={() => setIsPlanningFormOpen((prev) => !prev)}
                >
                  {isPlanningFormOpen ? t('dashboard.hideEventForm') : t('dashboard.addEvent')}
                </button>
                <div className={styles.monthNavigation}>
                  <button
                    type="button"
                    className={styles.monthNavButton}
                    onClick={goToPreviousMonth}
                    aria-label={t('dashboard.prevMonth')}
                  >
                    ←
                  </button>
                  <span className={styles.monthLabel}>{displayedMonthLabel}</span>
                  <button
                    type="button"
                    className={styles.monthNavButton}
                    onClick={goToNextMonth}
                    aria-label={t('dashboard.nextMonth')}
                  >
                    →
                  </button>
                </div>
              </div>
              {isPlanningFormOpen ? (
              <div className={styles.planningForm}>
                <div className={styles.planningFormFields}>
                  <input
                    placeholder={t('dashboard.eventTitlePlaceholder')}
                    value={planningDraft.title}
                    onChange={(event) => setPlanningDraftField('title', event.target.value)}
                  />
                  <input
                    type="date"
                    value={planningDraft.publishAt}
                    onChange={(event) => setPlanningDraftField('publishAt', event.target.value)}
                  />
                  <select
                    value={planningDraft.platform}
                    onChange={(event) => setPlanningDraftField('platform', event.target.value)}
                  >
                    <option value="">{t('dashboard.platformSelect')}</option>
                    {platformChoicesForForms.map((item) => (
                      <option key={`planning-platform-${item}`} value={item}>
                        {item === NO_PLATFORM_LABEL ? t('dashboard.noPlatformOption') : item}
                      </option>
                    ))}
                  </select>
                  <select
                    value={planningDraft.status}
                    onChange={(event) =>
                      setPlanningDraftField(
                        'status',
                        event.target.value as 'draft' | 'scheduled' | 'published',
                      )
                    }
                  >
                    <option value="draft">{statusLabels.draft}</option>
                    <option value="scheduled">{statusLabels.scheduled}</option>
                    <option value="published">{statusLabels.published}</option>
                  </select>
                </div>
                {!isPlanningDraftValid ? (
                  <p className={styles.planningFormHint} role="status">
                    {t('dashboard.planningHint')}
                  </p>
                ) : null}
                <div className={styles.planningFormActions}>
                  <button
                    type="button"
                    className={styles.planningFormSubmit}
                    disabled={!isPlanningDraftValid}
                    title={
                      isPlanningDraftValid
                        ? undefined
                        : t('dashboard.planningSubmitTitle')
                    }
                    onClick={submitPlanningDraft}
                  >
                    {editingPlanningId ? t('dashboard.editEvent') : t('dashboard.addEvent')}
                  </button>
                  {editingPlanningId ? (
                    <button
                      type="button"
                      onClick={() => {
                        resetPlanningDraft()
                        setIsPlanningFormOpen(false)
                      }}
                    >
                      {t('dashboard.cancel')}
                    </button>
                  ) : null}
                </div>
              </div>
              ) : null}
              <div className={styles.agendaGrid}>
                {dateSlots.map((slot) => {
                  const dayItems = planningByDate.get(slot.key) ?? []
                  return (
                    <div
                      key={slot.key}
                      className={`${styles.agendaDay} ${dragOverDateKey === slot.key ? styles.agendaDayDropOver : ''}`}
                      onDragOver={(event) => handleDateDragOver(event, slot.key)}
                      onDragLeave={handleDateDragLeave}
                      onDrop={(event) => handleDateDrop(event, slot.key)}
                    >
                      <p className={styles.agendaDate}>{slot.label}</p>
                      {dayItems.length === 0 ? (
                        <small className={styles.emptyText}>{t('dashboard.emptyDay')}</small>
                      ) : (
                        <ul className={styles.miniList}>
                          {dayItems.map((item) => (
                            <li
                              key={item.id}
                              draggable
                              data-search-id={toSearchTargetId('planning', item.id)}
                              className={`${styles.agendaItem} ${
                                highlightedItemId === toSearchTargetId('planning', item.id)
                                  ? styles.itemPulse
                                  : ''
                              } ${draggingPlanningId === item.id ? styles.agendaItemDragging : ''}`}
                              onDragStart={(event) => handlePlanningDragStart(event, item.id)}
                              onDragEnd={handlePlanningDragEnd}
                            >
                              <span className={styles.agendaDot} />
                              <div>
                                <strong>{highlightMatch(item.title, search)}</strong>
                                <small>
                                  {highlightMatch(item.platform, search)} -{' '}
                                  {highlightMatch(item.status, search)}
                                </small>
                                <div className={styles.planningItemActions}>
                                  <button
                                    type="button"
                                    className={styles.iconActionButton}
                                    data-tooltip={t('dashboard.edit')}
                                    aria-label={t('dashboard.editEvent')}
                                    onClick={() => startPlanningEdit(item)}
                                  >
                                    <AiOutlineEdit aria-hidden="true" />
                                  </button>
                                  <button
                                    type="button"
                                    className={`${styles.iconActionButton} ${styles.deleteAction}`}
                                    data-tooltip={t('dashboard.delete')}
                                    aria-label={t('dashboard.deleteEvent')}
                                    onClick={() => askPlanningDelete(item)}
                                  >
                                    <AiOutlineDelete aria-hidden="true" />
                                  </button>
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )
                })}
              </div>
              </>
              ) : null}
            </div>
          </article>

          <article
            data-panel-card="videos"
            className={`${styles.panelCard} ${styles.panelVideos} ${
              highlightedPanel === 'videos' ? styles.panelPulse : ''
            } ${styles.panelCardDraggable} ${
              draggingPanel === 'videos' ? styles.panelCardDragging : ''
            } ${dragOverPanel === 'videos' ? styles.panelCardDropTarget : ''} ${
              isLastPanelSingle && lastPanel === 'videos' ? styles.panelFullWidth : ''
            } ${!collapsedPanels.videos ? styles.panelCardOpen : styles.panelCardCollapsed}`}
            style={{ order: panelOrderIndex.videos }}
            draggable
            onDragStart={(event) => handlePanelDragStart(event, 'videos')}
            onDragOver={(event) => handlePanelDragOver(event, 'videos')}
            onDrop={(event) => handlePanelDrop(event, 'videos')}
            onDragEnd={handlePanelDragEnd}
            ref={(node) => {
              panelCardRefs.current.videos = node
            }}
          >
            <div className={styles.panelContent}>
              <div className={styles.panelHeader}>
                <h3>{t('dashboard.videosTitle')}</h3>
                <div className={styles.calendarHeaderActions}>
                  <button
                    type="button"
                    className={styles.panelExpandButton}
                    onClick={() => togglePanelCollapsed('videos')}
                    aria-label={
                      collapsedPanels.videos
                        ? t('dashboard.expandVideosPanel')
                        : t('dashboard.collapseVideosPanel')
                    }
                  >
                    <HiChevronDown
                      className={`${styles.dropdownIcon} ${
                        collapsedPanels.videos ? styles.dropdownChevronCollapsed : ''
                      }`}
                      aria-hidden="true"
                    />
                  </button>
                  <button
                    type="button"
                    className={styles.panelExpandButton}
                    onClick={() => toggleFocusedPanel('videos')}
                    aria-label={t('dashboard.expandVideosFull')}
                  >
                    ⤢
                  </button>
                </div>
              </div>
              {!collapsedPanels.videos ? (
              <>
              <div className={styles.dropdownRow}>
                <button
                  type="button"
                  className={styles.dropdownTrigger}
                  onClick={() => setIsVideoFormOpen((prev) => !prev)}
                >
                  {isVideoFormOpen ? t('dashboard.hideVideoForm') : t('dashboard.addVideoTracking')}
                </button>
              </div>
              {isVideoFormOpen ? (
              <div className={styles.videoForm}>
                <div className={styles.videoFormFields}>
                  <input
                    placeholder={t('dashboard.videoTitlePlaceholder')}
                    value={videoDraft.title}
                    onChange={(event) => setVideoDraftField('title', event.target.value)}
                  />
                  <input
                    type="date"
                    value={videoDraft.deadline}
                    onChange={(event) => setVideoDraftField('deadline', event.target.value)}
                  />
                  <select
                    value={videoDraft.platform}
                    onChange={(event) => setVideoDraftField('platform', event.target.value)}
                  >
                    <option value="">{t('dashboard.platformSelect')}</option>
                    {platformChoicesForForms.map((item) => (
                      <option key={`videos-platform-${item}`} value={item}>
                        {item === NO_PLATFORM_LABEL ? t('dashboard.noPlatformOption') : item}
                      </option>
                    ))}
                  </select>
                  <select
                    value={videoDraft.stage}
                    onChange={(event) =>
                      setVideoDraftField('stage', event.target.value as VideoStage)
                    }
                  >
                    <option value="idea">{stageLabels.idea}</option>
                    <option value="scripting">{stageLabels.scripting}</option>
                    <option value="recording">{stageLabels.recording}</option>
                    <option value="editing">{stageLabels.editing}</option>
                    <option value="published">{stageLabels.published}</option>
                  </select>
                </div>
                {!isVideoDraftValid ? (
                  <p className={styles.planningFormHint} role="status">
                    {t('dashboard.videoHint')}
                  </p>
                ) : null}
                <div className={styles.videoFormActions}>
                  <button
                    type="button"
                    className={styles.planningFormSubmit}
                    disabled={!isVideoDraftValid}
                    title={
                      isVideoDraftValid
                        ? undefined
                        : t('dashboard.videoSubmitTitle')
                    }
                    onClick={submitVideoDraft}
                  >
                    {editingVideoId ? t('dashboard.editVideo') : t('dashboard.addVideoTracking')}
                  </button>
                  {editingVideoId ? (
                    <button
                      type="button"
                      onClick={() => {
                        resetVideoDraft()
                        setIsVideoFormOpen(false)
                      }}
                    >
                      {t('dashboard.cancel')}
                    </button>
                  ) : null}
                </div>
              </div>
              ) : null}
              <ul className={styles.list}>
                {filteredVideos.map((video) =>
                  renderVideoListItem(video, `stage-${video.id}`),
                )}
              </ul>
              </>
              ) : null}
            </div>
          </article>

          <article
            data-panel-card="todo"
            className={`${styles.panelCard} ${styles.panelTodo} ${
              highlightedPanel === 'todo' ? styles.panelPulse : ''
            } ${styles.panelCardDraggable} ${
              draggingPanel === 'todo' ? styles.panelCardDragging : ''
            } ${dragOverPanel === 'todo' ? styles.panelCardDropTarget : ''} ${
              isLastPanelSingle && lastPanel === 'todo' ? styles.panelFullWidth : ''
            } ${!collapsedPanels.todo ? styles.panelCardOpen : styles.panelCardCollapsed}`}
            style={{ order: panelOrderIndex.todo }}
            draggable
            onDragStart={(event) => handlePanelDragStart(event, 'todo')}
            onDragOver={(event) => handlePanelDragOver(event, 'todo')}
            onDrop={(event) => handlePanelDrop(event, 'todo')}
            onDragEnd={handlePanelDragEnd}
            ref={(node) => {
              panelCardRefs.current.todo = node
            }}
          >
            <div className={styles.panelContent}>
              <div className={styles.panelHeader}>
                <h3>{t('dashboard.todoTitle')}</h3>
                <div className={styles.calendarHeaderActions}>
                  <button
                    type="button"
                    className={styles.panelExpandButton}
                    onClick={() => togglePanelCollapsed('todo')}
                    aria-label={
                      collapsedPanels.todo
                        ? t('dashboard.expandTodoPanel')
                        : t('dashboard.collapseTodoPanel')
                    }
                  >
                    <HiChevronDown
                      className={`${styles.dropdownIcon} ${
                        collapsedPanels.todo ? styles.dropdownChevronCollapsed : ''
                      }`}
                      aria-hidden="true"
                    />
                  </button>
                  <button
                    type="button"
                    className={styles.panelExpandButton}
                    onClick={() => toggleFocusedPanel('todo')}
                    aria-label={t('dashboard.expandTodoFull')}
                  >
                    ⤢
                  </button>
                </div>
              </div>
              {!collapsedPanels.todo ? (
              <>
              <div className={styles.dropdownRow}>
                <button
                  type="button"
                  className={styles.dropdownTrigger}
                  onClick={() => setIsTodoFormOpen((prev) => !prev)}
                >
                  {isTodoFormOpen ? t('dashboard.hideTaskForm') : t('dashboard.addTask')}
                </button>
              </div>
              {isTodoFormOpen ? (
              <div className={styles.todoForm}>
                <div className={styles.todoFormFields}>
                  <input
                    placeholder={t('dashboard.taskTitlePlaceholder')}
                    value={todoDraft.label}
                    onChange={(event) => setTodoDraftField('label', event.target.value)}
                  />
                  <select
                    value={todoDraft.platform}
                    onChange={(event) => setTodoDraftField('platform', event.target.value)}
                  >
                    <option value="">{t('dashboard.platformSelect')}</option>
                    {platformChoicesForForms.map((item) => (
                      <option key={`todo-platform-${item}`} value={item}>
                        {item === NO_PLATFORM_LABEL ? t('dashboard.noPlatformOption') : item}
                      </option>
                    ))}
                  </select>
                  <select
                    value={todoDraft.priority}
                    onChange={(event) =>
                      setTodoDraftField('priority', event.target.value as 'low' | 'medium' | 'high')
                    }
                  >
                    <option value="low">{priorityLabels.low}</option>
                    <option value="medium">{priorityLabels.medium}</option>
                    <option value="high">{priorityLabels.high}</option>
                  </select>
                  <select
                    value={todoDraft.column}
                    onChange={(event) =>
                      setTodoDraftField('column', event.target.value as TodoColumn)
                    }
                  >
                    <option value="todo">{columnLabels.todo}</option>
                    <option value="doing">{columnLabels.doing}</option>
                    <option value="done">{columnLabels.done}</option>
                  </select>
                </div>
                {!isTodoDraftValid ? (
                  <p className={styles.planningFormHint} role="status">
                    {t('dashboard.todoHint')}
                  </p>
                ) : null}
                <div className={styles.todoFormActions}>
                  <button
                    type="button"
                    className={styles.planningFormSubmit}
                    disabled={!isTodoDraftValid}
                    title={
                      isTodoDraftValid
                        ? undefined
                        : t('dashboard.todoSubmitTitle')
                    }
                    onClick={submitTodoDraft}
                  >
                    {editingTodoId ? t('dashboard.editTask') : t('dashboard.addTask')}
                  </button>
                  {editingTodoId ? (
                    <button
                      type="button"
                      onClick={() => {
                        resetTodoDraft()
                        setIsTodoFormOpen(false)
                      }}
                    >
                      {t('dashboard.cancel')}
                    </button>
                  ) : null}
                </div>
              </div>
              ) : null}
              <div className={styles.kanban}>
                {(['todo', 'doing', 'done'] as const).map((column) => (
                  <div
                    key={column}
                    className={`${styles.kanbanColumn} ${
                      dragOverColumn === column || touchOverColumn === column
                        ? styles.kanbanColumnDropTarget
                        : ''
                    }`}
                    data-kanban-column={column}
                    onDragOver={(event) => handleColumnDragOver(event, column)}
                    onDragLeave={() => setDragOverColumn(null)}
                    onDrop={(event) => handleColumnDrop(event, column)}
                  >
                    <p className={styles.columnTitle}>
                      {columnLabels[column]}
                    </p>
                    {filteredBoard
                      .filter((task) => task.column === column)
                      .map((task) => (
                        <div
                          key={task.id}
                          data-search-id={toSearchTargetId('todo', task.id)}
                          className={`${styles.taskCard} ${
                            draggingTaskId === task.id ? styles.taskCardDragging : ''
                          } ${
                            highlightedItemId === toSearchTargetId('todo', task.id) ? styles.itemPulse : ''
                          }`}
                          draggable
                          onDragStart={(event) => handleTaskDragStart(event, task.id)}
                          onDragEnd={handleTaskDragEnd}
                          onTouchStart={() => handleTaskTouchStart(task.id)}
                          onTouchMove={handleTaskTouchMove}
                          onTouchEnd={handleTaskTouchEnd}
                          onTouchCancel={handleTaskTouchEnd}
                        >
                          <input
                            className={styles.taskTitleInput}
                            value={task.label}
                            onChange={(event) => setTaskLabel(task.id, event.target.value)}
                          />
                          <div className={styles.taskItemActions}>
                            <button
                              type="button"
                              className={styles.iconActionButton}
                              data-tooltip={t('dashboard.edit')}
                              aria-label={t('dashboard.editTask')}
                              onClick={() => startTodoEdit(task)}
                            >
                              <AiOutlineEdit aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              className={`${styles.iconActionButton} ${styles.deleteAction}`}
                              data-tooltip={t('dashboard.delete')}
                              aria-label={t('dashboard.deleteTaskAria')}
                              onClick={() => askTodoDelete(task)}
                            >
                              <AiOutlineDelete aria-hidden="true" />
                            </button>
                          </div>
                        <p className={styles.matchPreview}>{highlightMatch(task.label, search)}</p>
                          <small>
                            {highlightMatch(task.platform, search)} -{' '}
                            {highlightMatch(task.priority, search)}
                          </small>
                          <div className={styles.checklistBox}>
                            {task.checklist.map((item) => (
                              <label key={item.id} className={styles.checkItem}>
                                <input
                                  type="checkbox"
                                  checked={item.done}
                                  onChange={() => toggleChecklistItem(task.id, item.id)}
                                />
                                <span className={item.done ? styles.checkItemDone : ''}>{item.text}</span>
                              </label>
                            ))}
                            <div className={styles.checklistInputRow}>
                              <input
                                placeholder={t('dashboard.addChecklistPlaceholder')}
                                value={task.newChecklistText}
                                onChange={(event) =>
                                  setTaskDraftChecklist(task.id, event.target.value)
                                }
                              />
                              <button type="button" onClick={() => addChecklistItem(task.id)}>
                                +
                              </button>
                            </div>
                          </div>
                          <small className={styles.dragHint}>{t('dashboard.dragCardHint')}</small>
                        </div>
                      ))}
                  </div>
                ))}
              </div>
              </>
              ) : null}
            </div>
          </article>

          <article
            data-panel-card="chart"
            className={`${styles.panelCard} ${styles.panelChart} ${
              highlightedPanel === 'chart' ? styles.panelPulse : ''
            } ${styles.panelCardDraggable} ${
              draggingPanel === 'chart' ? styles.panelCardDragging : ''
            } ${dragOverPanel === 'chart' ? styles.panelCardDropTarget : ''} ${
              isLastPanelSingle && lastPanel === 'chart' ? styles.panelFullWidth : ''
            } ${!collapsedPanels.chart ? styles.panelCardOpen : styles.panelCardCollapsed}`}
            style={{ order: panelOrderIndex.chart }}
            draggable
            onDragStart={(event) => handlePanelDragStart(event, 'chart')}
            onDragOver={(event) => handlePanelDragOver(event, 'chart')}
            onDrop={(event) => handlePanelDrop(event, 'chart')}
            onDragEnd={handlePanelDragEnd}
            ref={(node) => {
              panelCardRefs.current.chart = node
            }}
          >
            <div className={styles.panelContent}>
              <div className={styles.panelHeader}>
                <h3>{t('dashboard.statsTitle')}</h3>
                <div className={styles.calendarHeaderActions}>
                  <button
                    type="button"
                    className={styles.panelExpandButton}
                    onClick={() => togglePanelCollapsed('chart')}
                    aria-label={
                      collapsedPanels.chart
                        ? t('dashboard.expandChartPanel')
                        : t('dashboard.collapseChartPanel')
                    }
                  >
                    <HiChevronDown
                      className={`${styles.dropdownIcon} ${
                        collapsedPanels.chart ? styles.dropdownChevronCollapsed : ''
                      }`}
                      aria-hidden="true"
                    />
                  </button>
                  <button
                    type="button"
                    className={styles.panelExpandButton}
                    onClick={() => toggleFocusedPanel('chart')}
                    aria-label={t('dashboard.expandChartFull')}
                  >
                    ⤢
                  </button>
                </div>
              </div>
              {!collapsedPanels.chart ? (
              <div className={styles.chartCenterArea}>
                <div className={styles.chartWrap}>
                  <ResponsiveContainer width="100%" height={240}>
                    <ComposedChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#dbe2ee" />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#475569' }} />
                      <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#475569' }} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#475569' }} />
                      <Tooltip />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="vues"
                        name={t('dashboard.totalViews')}
                        stroke="#2563eb"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="engagement"
                        name={t('dashboard.avgEngagement')}
                        stroke="#7c3aed"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Bar
                        yAxisId="left"
                        dataKey="publies"
                        name={t('dashboard.chartPublishedPeriod')}
                        fill="#14b8a6"
                        radius={[4, 4, 0, 0]}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
              ) : null}
            </div>
          </article>

        </section>
      </>
      {focusedPanel ? (
        <div
          className={styles.simpleModalOverlay}
          onClick={closeFocusedPanel}
          role="presentation"
        >
          <div
            className={`${styles.simpleModalCard} ${
              focusedPanel === 'planning'
                ? styles.modalCardPlanning
                : focusedPanel === 'videos'
                  ? styles.modalCardVideos
                  : focusedPanel === 'todo'
                    ? styles.modalCardTodo
                    : styles.modalCardChart
            }`}
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className={styles.panelHeader}>
              <h3>
                {focusedPanel === 'planning'
                  ? t('dashboard.planningTitle')
                  : focusedPanel === 'videos'
                    ? t('dashboard.videosTitle')
                    : focusedPanel === 'todo'
                      ? t('dashboard.todoTitle')
                      : t('dashboard.statsTitle')}
              </h3>
              <div className={styles.calendarHeaderActions}>
                <button
                  type="button"
                  className={styles.panelExpandButton}
                  onClick={closeFocusedPanel}
                  aria-label={t('dashboard.closeModal')}
                >
                  ×
                </button>
              </div>
            </div>

            {focusedPanel === 'planning' ? (
              <>
                <div className={styles.planningToolbar}>
                  <button
                    type="button"
                    className={styles.dropdownTrigger}
                    onClick={() => setIsPlanningFormOpen((prev) => !prev)}
                  >
                    {isPlanningFormOpen ? t('dashboard.hideEventForm') : t('dashboard.addEvent')}
                  </button>
                  <div className={styles.monthNavigation}>
                    <button
                      type="button"
                      className={styles.monthNavButton}
                      onClick={goToPreviousMonth}
                      aria-label={t('dashboard.prevMonth')}
                    >
                      ←
                    </button>
                    <span className={styles.monthLabel}>{displayedMonthLabel}</span>
                    <button
                      type="button"
                      className={styles.monthNavButton}
                      onClick={goToNextMonth}
                      aria-label={t('dashboard.nextMonth')}
                    >
                      →
                    </button>
                  </div>
                </div>
                {isPlanningFormOpen ? (
                <div className={styles.planningForm}>
                  <div className={styles.planningFormFields}>
                    <input
                      placeholder={t('dashboard.eventTitlePlaceholder')}
                      value={planningDraft.title}
                      onChange={(event) => setPlanningDraftField('title', event.target.value)}
                    />
                    <input
                      type="date"
                      value={planningDraft.publishAt}
                      onChange={(event) => setPlanningDraftField('publishAt', event.target.value)}
                    />
                    <select
                      value={planningDraft.platform}
                      onChange={(event) => setPlanningDraftField('platform', event.target.value)}
                    >
                      <option value="">{t('dashboard.platformSelect')}</option>
                      {platformChoicesForForms.map((item) => (
                        <option key={`modal-planning-platform-${item}`} value={item}>
                          {item === NO_PLATFORM_LABEL ? t('dashboard.noPlatformOption') : item}
                        </option>
                      ))}
                    </select>
                    <select
                      value={planningDraft.status}
                      onChange={(event) =>
                        setPlanningDraftField(
                          'status',
                          event.target.value as 'draft' | 'scheduled' | 'published',
                        )
                      }
                    >
                      <option value="draft">{statusLabels.draft}</option>
                      <option value="scheduled">{statusLabels.scheduled}</option>
                      <option value="published">{statusLabels.published}</option>
                    </select>
                  </div>
                  {!isPlanningDraftValid ? (
                    <p className={styles.planningFormHint} role="status">
                      {t('dashboard.planningHint')}
                    </p>
                  ) : null}
                  <div className={styles.planningFormActions}>
                    <button
                      type="button"
                      className={styles.planningFormSubmit}
                      disabled={!isPlanningDraftValid}
                      title={
                        isPlanningDraftValid
                          ? undefined
                          : t('dashboard.planningSubmitTitle')
                      }
                      onClick={submitPlanningDraft}
                    >
                      {editingPlanningId ? t('dashboard.editEvent') : t('dashboard.addEvent')}
                    </button>
                    {editingPlanningId ? (
                      <button
                        type="button"
                        onClick={() => {
                          resetPlanningDraft()
                          setIsPlanningFormOpen(false)
                        }}
                      >
                        {t('dashboard.cancel')}
                      </button>
                    ) : null}
                  </div>
                </div>
                ) : null}
                <div className={styles.agendaGrid}>
                  {dateSlots.map((slot) => {
                    const dayItems = planningByDate.get(slot.key) ?? []
                    return (
                      <div
                        key={slot.key}
                        className={`${styles.agendaDay} ${dragOverDateKey === slot.key ? styles.agendaDayDropOver : ''}`}
                        onDragOver={(event) => handleDateDragOver(event, slot.key)}
                        onDragLeave={handleDateDragLeave}
                        onDrop={(event) => handleDateDrop(event, slot.key)}
                      >
                        <p className={styles.agendaDate}>{slot.label}</p>
                        {dayItems.length === 0 ? (
                          <small className={styles.emptyText}>{t('dashboard.emptyDay')}</small>
                        ) : (
                          <ul className={styles.miniList}>
                            {dayItems.map((item) => (
                              <li
                                key={item.id}
                                draggable
                                data-search-id={toSearchTargetId('planning', item.id)}
                                className={`${styles.agendaItem} ${
                                  highlightedItemId === toSearchTargetId('planning', item.id)
                                    ? styles.itemPulse
                                    : ''
                                } ${draggingPlanningId === item.id ? styles.agendaItemDragging : ''}`}
                                onDragStart={(event) => handlePlanningDragStart(event, item.id)}
                                onDragEnd={handlePlanningDragEnd}
                              >
                                <span className={styles.agendaDot} />
                                <div>
                                  <strong>{highlightMatch(item.title, search)}</strong>
                                  <small>
                                    {highlightMatch(item.platform, search)} -{' '}
                                    {highlightMatch(item.status, search)}
                                  </small>
                                  <div className={styles.planningItemActions}>
                                    <button
                                      type="button"
                                      className={styles.iconActionButton}
                                      data-tooltip={t('dashboard.edit')}
                                      aria-label={t('dashboard.editEvent')}
                                      onClick={() => startPlanningEdit(item)}
                                    >
                                      <AiOutlineEdit aria-hidden="true" />
                                    </button>
                                    <button
                                      type="button"
                                      className={`${styles.iconActionButton} ${styles.deleteAction}`}
                                      data-tooltip={t('dashboard.delete')}
                                      aria-label={t('dashboard.deleteEvent')}
                                      onClick={() => askPlanningDelete(item)}
                                    >
                                      <AiOutlineDelete aria-hidden="true" />
                                    </button>
                                  </div>
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )
                  })}
                </div>
              </>
            ) : null}

            {focusedPanel === 'videos' ? (
              <>
              <div className={styles.dropdownRow}>
                <button
                  type="button"
                  className={styles.dropdownTrigger}
                  onClick={() => setIsVideoFormOpen((prev) => !prev)}
                >
                  {isVideoFormOpen ? t('dashboard.hideVideoForm') : t('dashboard.addVideoTracking')}
                </button>
              </div>
              {isVideoFormOpen ? (
              <div className={styles.videoForm}>
                <div className={styles.videoFormFields}>
                  <input
                    placeholder={t('dashboard.videoTitlePlaceholder')}
                    value={videoDraft.title}
                    onChange={(event) => setVideoDraftField('title', event.target.value)}
                  />
                  <input
                    type="date"
                    value={videoDraft.deadline}
                    onChange={(event) => setVideoDraftField('deadline', event.target.value)}
                  />
                  <select
                    value={videoDraft.platform}
                    onChange={(event) => setVideoDraftField('platform', event.target.value)}
                  >
                    <option value="">{t('dashboard.platformSelect')}</option>
                    {platformChoicesForForms.map((item) => (
                      <option key={`modal-videos-platform-${item}`} value={item}>
                        {item === NO_PLATFORM_LABEL ? t('dashboard.noPlatformOption') : item}
                      </option>
                    ))}
                  </select>
                  <select
                    value={videoDraft.stage}
                    onChange={(event) =>
                      setVideoDraftField('stage', event.target.value as VideoStage)
                    }
                  >
                    <option value="idea">{stageLabels.idea}</option>
                    <option value="scripting">{stageLabels.scripting}</option>
                    <option value="recording">{stageLabels.recording}</option>
                    <option value="editing">{stageLabels.editing}</option>
                    <option value="published">{stageLabels.published}</option>
                  </select>
                </div>
                {!isVideoDraftValid ? (
                  <p className={styles.planningFormHint} role="status">
                    {t('dashboard.videoHint')}
                  </p>
                ) : null}
                <div className={styles.videoFormActions}>
                  <button
                    type="button"
                    className={styles.planningFormSubmit}
                    disabled={!isVideoDraftValid}
                    title={
                      isVideoDraftValid
                        ? undefined
                        : t('dashboard.videoSubmitTitle')
                    }
                    onClick={submitVideoDraft}
                  >
                    {editingVideoId ? t('dashboard.editVideo') : t('dashboard.addVideoTracking')}
                  </button>
                  {editingVideoId ? (
                    <button
                      type="button"
                      onClick={() => {
                        resetVideoDraft()
                        setIsVideoFormOpen(false)
                      }}
                    >
                      {t('dashboard.cancel')}
                    </button>
                  ) : null}
                </div>
              </div>
              ) : null}
              <ul className={styles.list}>
                {filteredVideos.map((video) =>
                  renderVideoListItem(video, `modal-stage-${video.id}`),
                )}
              </ul>
              </>
            ) : null}

            {focusedPanel === 'todo' ? (
              <>
              <div className={styles.dropdownRow}>
                <button
                  type="button"
                  className={styles.dropdownTrigger}
                  onClick={() => setIsTodoFormOpen((prev) => !prev)}
                >
                  {isTodoFormOpen ? t('dashboard.hideTaskForm') : t('dashboard.addTask')}
                </button>
              </div>
              {isTodoFormOpen ? (
              <div className={styles.todoForm}>
                <div className={styles.todoFormFields}>
                  <input
                    placeholder={t('dashboard.taskTitlePlaceholder')}
                    value={todoDraft.label}
                    onChange={(event) => setTodoDraftField('label', event.target.value)}
                  />
                  <select
                    value={todoDraft.platform}
                    onChange={(event) => setTodoDraftField('platform', event.target.value)}
                  >
                    <option value="">{t('dashboard.platformSelect')}</option>
                    {platformChoicesForForms.map((item) => (
                      <option key={`modal-todo-platform-${item}`} value={item}>
                        {item === NO_PLATFORM_LABEL ? t('dashboard.noPlatformOption') : item}
                      </option>
                    ))}
                  </select>
                  <select
                    value={todoDraft.priority}
                    onChange={(event) =>
                      setTodoDraftField('priority', event.target.value as 'low' | 'medium' | 'high')
                    }
                  >
                    <option value="low">{priorityLabels.low}</option>
                    <option value="medium">{priorityLabels.medium}</option>
                    <option value="high">{priorityLabels.high}</option>
                  </select>
                  <select
                    value={todoDraft.column}
                    onChange={(event) =>
                      setTodoDraftField('column', event.target.value as TodoColumn)
                    }
                  >
                    <option value="todo">{columnLabels.todo}</option>
                    <option value="doing">{columnLabels.doing}</option>
                    <option value="done">{columnLabels.done}</option>
                  </select>
                </div>
                {!isTodoDraftValid ? (
                  <p className={styles.planningFormHint} role="status">
                    {t('dashboard.todoHint')}
                  </p>
                ) : null}
                <div className={styles.todoFormActions}>
                  <button
                    type="button"
                    className={styles.planningFormSubmit}
                    disabled={!isTodoDraftValid}
                    title={
                      isTodoDraftValid
                        ? undefined
                        : t('dashboard.todoSubmitTitle')
                    }
                    onClick={submitTodoDraft}
                  >
                    {editingTodoId ? t('dashboard.editTask') : t('dashboard.addTask')}
                  </button>
                  {editingTodoId ? (
                    <button
                      type="button"
                      onClick={() => {
                        resetTodoDraft()
                        setIsTodoFormOpen(false)
                      }}
                    >
                      {t('dashboard.cancel')}
                    </button>
                  ) : null}
                </div>
              </div>
              ) : null}
              <div className={styles.kanban}>
                {(['todo', 'doing', 'done'] as const).map((column) => (
                  <div
                    key={column}
                    className={`${styles.kanbanColumn} ${
                      dragOverColumn === column || touchOverColumn === column
                        ? styles.kanbanColumnDropTarget
                        : ''
                    }`}
                    data-kanban-column={column}
                    onDragOver={(event) => handleColumnDragOver(event, column)}
                    onDragLeave={() => setDragOverColumn(null)}
                    onDrop={(event) => handleColumnDrop(event, column)}
                  >
                    <p className={styles.columnTitle}>
                      {columnLabels[column]}
                    </p>
                    {filteredBoard
                      .filter((task) => task.column === column)
                      .map((task) => (
                        <div
                          key={task.id}
                          data-search-id={toSearchTargetId('todo', task.id)}
                          className={`${styles.taskCard} ${
                            draggingTaskId === task.id ? styles.taskCardDragging : ''
                          } ${
                            highlightedItemId === toSearchTargetId('todo', task.id) ? styles.itemPulse : ''
                          }`}
                          draggable
                          onDragStart={(event) => handleTaskDragStart(event, task.id)}
                          onDragEnd={handleTaskDragEnd}
                          onTouchStart={() => handleTaskTouchStart(task.id)}
                          onTouchMove={handleTaskTouchMove}
                          onTouchEnd={handleTaskTouchEnd}
                          onTouchCancel={handleTaskTouchEnd}
                        >
                          <input
                            className={styles.taskTitleInput}
                            value={task.label}
                            onChange={(event) => setTaskLabel(task.id, event.target.value)}
                          />
                          <div className={styles.taskItemActions}>
                            <button
                              type="button"
                              className={styles.iconActionButton}
                              data-tooltip={t('dashboard.edit')}
                              aria-label={t('dashboard.editTask')}
                              onClick={() => startTodoEdit(task)}
                            >
                              <AiOutlineEdit aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              className={`${styles.iconActionButton} ${styles.deleteAction}`}
                              data-tooltip={t('dashboard.delete')}
                              aria-label={t('dashboard.deleteTaskAria')}
                              onClick={() => askTodoDelete(task)}
                            >
                              <AiOutlineDelete aria-hidden="true" />
                            </button>
                          </div>
                          <small>
                            {highlightMatch(task.platform, search)} -{' '}
                            {highlightMatch(task.priority, search)}
                          </small>
                          <small className={styles.dragHint}>{t('dashboard.dragCardHint')}</small>
                        </div>
                      ))}
                  </div>
                ))}
              </div>
              </>
            ) : null}
            {focusedPanel === 'chart' ? (
              <div className={`${styles.chartWrap} ${styles.chartWrapModal}`}>
                <ResponsiveContainer width="100%" height={380}>
                  <ComposedChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#dbe2ee" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#475569' }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#475569' }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#475569' }} />
                    <Tooltip />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="vues"
                      name={t('dashboard.totalViews')}
                      stroke="#2563eb"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="engagement"
                      name={t('dashboard.avgEngagement')}
                      stroke="#7c3aed"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Bar
                      yAxisId="left"
                      dataKey="publies"
                      name={t('dashboard.chartPublishedPeriod')}
                      fill="#14b8a6"
                      radius={[4, 4, 0, 0]}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            ) : null}

          </div>
        </div>
      ) : null}
      {planningToDelete ? (
        <div className={styles.confirmOverlay} onClick={cancelPlanningDelete} role="presentation">
          <div
            className={styles.confirmCard}
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={t('dashboard.confirmDeleteEvent')}
          >
            <p className={styles.confirmText}>{t('dashboard.confirmDelete')}</p>
            <p className={styles.confirmSubtext}>{planningToDelete.title}</p>
            <div className={styles.confirmActions}>
              <button type="button" onClick={cancelPlanningDelete}>
                {t('dashboard.cancel')}
              </button>
              <button type="button" onClick={confirmPlanningDelete}>
                {t('dashboard.delete')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {platformToDelete ? (
        <div className={styles.confirmOverlay} onClick={cancelPlatformDelete} role="presentation">
          <div
            className={styles.confirmCard}
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={t('dashboard.confirmDeletePlatform')}
          >
            <p className={styles.confirmText}>{t('dashboard.confirmDelete')}</p>
            <p className={styles.confirmSubtext}>{platformToDelete}</p>
            <div className={styles.confirmActions}>
              <button type="button" onClick={cancelPlatformDelete}>
                {t('dashboard.cancel')}
              </button>
              <button type="button" onClick={confirmPlatformDelete}>
                {t('dashboard.delete')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {videoToDelete ? (
        <div className={styles.confirmOverlay} onClick={cancelVideoDelete} role="presentation">
          <div
            className={styles.confirmCard}
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={t('dashboard.confirmDeleteVideoLabel')}
          >
            <p className={styles.confirmText}>{t('dashboard.confirmDeleteVideo')}</p>
            <p className={styles.confirmSubtext}>{videoToDelete.title}</p>
            <div className={styles.confirmActions}>
              <button type="button" onClick={cancelVideoDelete}>
                {t('dashboard.cancel')}
              </button>
              <button type="button" onClick={confirmVideoDelete}>
                {t('dashboard.delete')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {todoToDelete ? (
        <div className={styles.confirmOverlay} onClick={cancelTodoDelete} role="presentation">
          <div
            className={styles.confirmCard}
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={t('dashboard.confirmDeleteTaskLabel')}
          >
            <p className={styles.confirmText}>{t('dashboard.confirmDeleteTask')}</p>
            <p className={styles.confirmSubtext}>{todoToDelete.label}</p>
            <div className={styles.confirmActions}>
              <button type="button" onClick={cancelTodoDelete}>
                {t('dashboard.cancel')}
              </button>
              <button type="button" onClick={confirmTodoDelete}>
                {t('dashboard.delete')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </CreatorAppShell>
  )
}
