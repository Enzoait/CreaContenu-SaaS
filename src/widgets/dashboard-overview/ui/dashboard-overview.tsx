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
import { HiChevronDown } from 'react-icons/hi2'
import { useNavigate } from 'react-router-dom'
import { useProfileTitleSuffix } from '../../../features/account-profile'
import { useAccountAvatarDataUrl } from '../../../pages/account-page/model'
import { CreatorAppShell } from '../../creator-app-shell'

/** Contenus sans plateforme utilisateur définie (remplace l’ancien repli « general ») */
const NO_PLATFORM_LABEL = 'pas de plateforme'

function normalizePlatformLabel(name: string): string {
  if (name === 'general') return NO_PLATFORM_LABEL
  return name
}

type TodoColumn = 'todo' | 'doing' | 'done'
type VideoStage = 'idea' | 'scripting' | 'recording' | 'editing' | 'published'
type PanelId = 'planning' | 'videos' | 'todo' | 'chart'
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

const PANEL_LABEL: Record<PanelId, string> = {
  planning: 'Planning',
  videos: 'Vidéos',
  todo: 'Todo',
  chart: 'Stats',
}

const COLUMN_LABEL: Record<string, string> = {
  todo: 'À faire',
  doing: 'En cours',
  done: 'Terminé',
}

const STAGE_LABEL: Record<string, string> = {
  idea: 'Idée',
  scripting: 'Script',
  recording: 'Tournage',
  editing: 'Montage',
  published: 'Publié',
}

const STATUS_LABEL: Record<string, string> = {
  draft: 'Brouillon',
  scheduled: 'Planifié',
  published: 'Publié',
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('fr-FR').format(value)
}

function formatDateLabel(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('fr-FR', {
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

function toMonthLabel(date: Date): string {
  return date.toLocaleDateString('fr-FR', {
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

  const filteredVideos = videoData
    .filter((item) => platform === 'all' || item.platform === platform)
    .filter((item) => isInPeriod(item.deadline, period))

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

    push({ label: 'planning', panel: 'planning', targetId: null })
    push({ label: 'agenda', panel: 'planning', targetId: null })
    push({ label: 'suivi des vidéos', panel: 'videos', targetId: null })
    push({ label: 'vidéos', panel: 'videos', targetId: null })
    push({ label: 'to-do list', panel: 'todo', targetId: null })
    push({ label: 'todo list', panel: 'todo', targetId: null })
    push({ label: 'tâches', panel: 'todo', targetId: null })
    push({ label: 'plateformes', panel: 'planning', targetId: null })
    push({ label: 'stats', panel: 'planning', targetId: null })

    for (const item of planningData) {
      const targetId = toSearchTargetId('planning', item.id)
      push({ label: item.title, panel: 'planning', targetId, detail: STATUS_LABEL[item.status] ?? item.status })
      push({ label: item.platform, panel: 'planning', targetId, detail: STATUS_LABEL[item.status] ?? item.status })
      push({ label: item.status, panel: 'planning', targetId })
    }
    for (const item of videoData) {
      const targetId = toSearchTargetId('video', item.id)
      push({ label: item.title, panel: 'videos', targetId, detail: STAGE_LABEL[item.stage] ?? item.stage })
      push({ label: item.platform, panel: 'videos', targetId, detail: STAGE_LABEL[item.stage] ?? item.stage })
      push({ label: item.stage, panel: 'videos', targetId })
    }
    for (const item of todoBoard) {
      const targetId = toSearchTargetId('todo', item.id)
      push({ label: item.label, panel: 'todo', targetId, detail: COLUMN_LABEL[item.column] ?? item.column })
      push({ label: item.platform, panel: 'todo', targetId, detail: COLUMN_LABEL[item.column] ?? item.column })
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
      const panelLabel = PANEL_LABEL[s.panel]
      const rawLabel = s.label

      const enrichedLabel =
        panels.size > 1
          ? `${rawLabel} — ${panelLabel}`
          : `${rawLabel} — ${panelLabel}${s.detail ? ` — ${s.detail}` : ''}`

      // On remplace label par le texte enrichi et on garde searchTerm pour setSearch
      pool.set(dedupeKey, { ...s, label: enrichedLabel, searchTerm: rawLabel })
    }

    const result = Array.from(pool.values()).slice(0, 8)
    console.log('[search]', { query, matchingCount: matching.length, labelCount: Object.fromEntries(labelCount), result: result.map(r => ({ label: r.label, searchTerm: r.searchTerm, panel: r.panel })) })
    return result
  }, [planningData, videoData, todoBoard, platformsForBanner, search])

  const ratio = filteredPlanning.length / Math.max(1, planningData.length)
  const periodWeight = period === '7d' ? 0.35 : period === '30d' ? 1 : period === '90d' ? 1.35 : 1.7
  const totalViews = Math.round((data?.stats.totalViews ?? 0) * periodWeight * Math.max(0.35, ratio))
  const engagement = Number(((data?.stats.engagementRate ?? 0) * Math.max(0.8, ratio)).toFixed(1))
  const publishedCount = filteredPlanning.filter(
    (item) => item.status === 'published' || item.status === 'scheduled',
  ).length

  const displayedMonthLabel = toMonthLabel(displayedMonthStart)

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
      return { key, label: formatDateLabel(key) }
    })
  }, [displayedMonthStart])

  const planningByDate = useMemo(() => {
    const map = new Map<string, PlanningItem[]>()
    for (const slot of dateSlots) {
      map.set(slot.key, planningData.filter((item) => toDateKey(item.publishAt) === slot.key))
    }
    return map
  }, [dateSlots, planningData])

  const handlePlanningDragStart = (event: React.DragEvent, itemId: string) => {
    event.stopPropagation()
    event.dataTransfer.setData('planningItemId', itemId)
    event.dataTransfer.effectAllowed = 'move'
    setDraggingPlanningId(itemId)
  }

  const handlePlanningDragEnd = () => {
    setDraggingPlanningId(null)
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
    const itemId = event.dataTransfer.getData('planningItemId')
    if (!itemId || !user) {
      setDraggingPlanningId(null)
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
    try {
      await updatePlanningItem(itemId, { publishAt: dateKey })
    } catch (error) {
      console.error('Erreur déplacement événement :', error)
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

  const handleTaskDragStart = (taskId: string) => {
    setDraggingTaskId(taskId)
  }

  const handleTaskDragEnd = () => {
    setDraggingTaskId(null)
    setDragOverColumn(null)
  }

  const handleColumnDragOver = (event: DragEvent<HTMLDivElement>, column: TodoColumn) => {
    event.preventDefault()
    setDragOverColumn(column)
  }

  const handleColumnDrop = (column: TodoColumn) => {
    if (draggingTaskId) {
      moveTask(draggingTaskId, column)
    }
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
      updateVideoItem(editingVideoId, {
        title: videoDraft.title.trim(),
        platform: videoDraft.platform,
        deadline: normalizedDate,
        stage: videoDraft.stage,
      }).catch(console.error)
      ensureVisibility(videoDraft.platform, normalizedDate)
      resetVideoDraft()
      setIsVideoFormOpen(false)
      return
    }

    if (!user?.id) return
    try {
      const newVideo = await addVideoItem(user.id, {
        title: videoDraft.title.trim(),
        platform: videoDraft.platform,
        deadline: normalizedDate,
        stage: videoDraft.stage,
      })
      addUserPlatform(user.id, newVideo.platform).catch(console.error)
      setVideoData((prev) => [...prev, newVideo])
      setVideoStages((prev) => ({ ...prev, [newVideo.id]: newVideo.stage }))
      ensureVisibility(newVideo.platform, newVideo.deadline)
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
      updatePlanningItem(editingPlanningId, {
        title: planningDraft.title.trim(),
        platform: planningDraft.platform,
        publishAt: normalizedDate,
        status: planningDraft.status,
      }).catch(console.error)
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

  const stageLabelMap: Record<VideoStage, string> = {
    idea: 'Idée',
    scripting: 'Script',
    recording: 'Tournage',
    editing: 'Montage',
    published: 'Publié',
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
        label: formatDateLabel(slot.key),
        vues,
        engagement: engagementJour,
        publies: publishedForDay,
      }
    })
  }, [dateSlots, filteredPlanning, filteredVideos, totalViews, engagement])

  const handlePanelDragStart = (panel: PanelId) => {
    setDraggingPanel(panel)
  }

  const handlePanelDragOver = (event: DragEvent<HTMLElement>, panel: PanelId) => {
    event.preventDefault()
    setDragOverPanel(panel)
  }

  const handlePanelDrop = (target: PanelId) => {
    if (!draggingPanel || draggingPanel === target) return
    setPanelOrder((prev) => {
      const next = [...prev]
      const fromIndex = next.indexOf(draggingPanel)
      const targetIndex = next.indexOf(target)
      if (fromIndex < 0 || targetIndex < 0) return prev
      next.splice(fromIndex, 1)
      next.splice(targetIndex, 0, draggingPanel)
      return next
    })
    setDraggingPanel(null)
    setDragOverPanel(null)
  }

  const handlePanelDragEnd = () => {
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

  if (isLoading) return <div className={styles.feedback}>Chargement du dashboard...</div>
  if (isError || !data)
    return <div className={styles.feedback}>Une erreur est survenue pendant le chargement.</div>

  return (
    <CreatorAppShell
      topBarTrailing={
        <>
          <button
            type="button"
            className={styles.profileButton}
            onClick={goToAccount}
            aria-label="Aller à la gestion utilisateur"
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
              placeholder="Rechercher dans planning, vidéos, to-do..."
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
          <h1>Dashboard créateur — {profileTitleSuffix}</h1>
          <p>Filtres actifs sur toutes les sections + recherche globale.</p>
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
              Toutes plateformes
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
                      aria-label={`Valider la modification de ${item}`}
                      onClick={() => renamePlatform(item, editingPlatformValue)}
                    >
                      ✓
                    </button>
                    <button
                      type="button"
                      className={styles.platformChipAction}
                      aria-label="Annuler la modification"
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
                          data-tooltip="Modifier"
                          aria-label={`Modifier la plateforme ${item}`}
                          onClick={() => startPlatformEdit(item)}
                        >
                          <AiOutlineEdit aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          className={`${styles.platformChipAction} ${styles.deleteAction}`}
                          data-tooltip="Supprimer"
                          aria-label={`Supprimer la plateforme ${item}`}
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
                  placeholder="plateforme"
                />
                <button type="button" onClick={createPlatform}>
                  OK
                </button>
              </div>
            ) : (
              <button
                type="button"
                className={styles.addPlatformButton}
                aria-label="Ajouter plateforme"
                onClick={() => setIsAddingPlatform(true)}
              >
                +
              </button>
            )}
          </div>
        </section>

        <h2 className={styles.sectionTitle}>Stats</h2>
        <section className={styles.statsGrid}>
          <article className={styles.statCard}>
            <p>Vues totales</p>
            <strong>{formatNumber(totalViews)}</strong>
          </article>
          <article className={styles.statCard}>
            <p>Engagement moyen</p>
            <strong>{engagement}%</strong>
          </article>
          <article className={styles.statCard}>
            <p>Publié sur la période</p>
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
            onDragStart={() => handlePanelDragStart('planning')}
            onDragOver={(event) => handlePanelDragOver(event, 'planning')}
            onDrop={() => handlePanelDrop('planning')}
            onDragEnd={handlePanelDragEnd}
            ref={(node) => {
              panelCardRefs.current.planning = node
            }}
          >
            <div className={styles.panelContent}>
              <div className={styles.panelHeader}>
                <h3>Planning (agenda)</h3>
                <div className={styles.calendarHeaderActions}>
                  <button
                    type="button"
                    className={styles.panelExpandButton}
                    onClick={() => togglePanelCollapsed('planning')}
                    aria-label={collapsedPanels.planning ? 'Déplier le planning' : 'Réduire le planning'}
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
                    aria-label="Agrandir le planning"
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
                  {isPlanningFormOpen ? 'Masquer ajout événement' : 'Ajouter un événement'}
                </button>
                <div className={styles.monthNavigation}>
                  <button
                    type="button"
                    className={styles.monthNavButton}
                    onClick={goToPreviousMonth}
                    aria-label="Mois précédent"
                  >
                    ←
                  </button>
                  <span className={styles.monthLabel}>{displayedMonthLabel}</span>
                  <button
                    type="button"
                    className={styles.monthNavButton}
                    onClick={goToNextMonth}
                    aria-label="Mois suivant"
                  >
                    →
                  </button>
                </div>
              </div>
              {isPlanningFormOpen ? (
              <div className={styles.planningForm}>
                <div className={styles.planningFormFields}>
                  <input
                    placeholder="Titre de l'événement"
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
                    <option value="">Plateforme</option>
                    {platformChoicesForForms.map((item) => (
                      <option key={`planning-platform-${item}`} value={item}>
                        {item === NO_PLATFORM_LABEL ? 'Pas de plateforme' : item}
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
                    <option value="draft">draft</option>
                    <option value="scheduled">scheduled</option>
                    <option value="published">published</option>
                  </select>
                </div>
                {!isPlanningDraftValid ? (
                  <p className={styles.planningFormHint} role="status">
                    Renseignez le titre, la date et une plateforme pour enregistrer.
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
                        : 'Titre, date et plateforme requis'
                    }
                    onClick={submitPlanningDraft}
                  >
                    {editingPlanningId ? "Modifier l'événement" : 'Ajouter un événement'}
                  </button>
                  {editingPlanningId ? (
                    <button
                      type="button"
                      onClick={() => {
                        resetPlanningDraft()
                        setIsPlanningFormOpen(false)
                      }}
                    >
                      Annuler
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
                        <small className={styles.emptyText}>Aucun contenu</small>
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
                                    data-tooltip="Modifier"
                                    aria-label="Modifier l'événement"
                                    onClick={() => startPlanningEdit(item)}
                                  >
                                    <AiOutlineEdit aria-hidden="true" />
                                  </button>
                                  <button
                                    type="button"
                                    className={`${styles.iconActionButton} ${styles.deleteAction}`}
                                    data-tooltip="Supprimer"
                                    aria-label="Supprimer l'événement"
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
            onDragStart={() => handlePanelDragStart('videos')}
            onDragOver={(event) => handlePanelDragOver(event, 'videos')}
            onDrop={() => handlePanelDrop('videos')}
            onDragEnd={handlePanelDragEnd}
            ref={(node) => {
              panelCardRefs.current.videos = node
            }}
          >
            <div className={styles.panelContent}>
              <div className={styles.panelHeader}>
                <h3>Suivi des vidéos</h3>
                <div className={styles.calendarHeaderActions}>
                  <button
                    type="button"
                    className={styles.panelExpandButton}
                    onClick={() => togglePanelCollapsed('videos')}
                    aria-label={collapsedPanels.videos ? 'Déplier le suivi vidéos' : 'Réduire le suivi vidéos'}
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
                    aria-label="Agrandir le suivi vidéos"
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
                  {isVideoFormOpen ? 'Masquer ajout de suivi vidéo' : 'Ajouter un suivi vidéo'}
                </button>
              </div>
              {isVideoFormOpen ? (
              <div className={styles.videoForm}>
                <div className={styles.videoFormFields}>
                  <input
                    placeholder="Titre de la vidéo"
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
                    <option value="">Plateforme</option>
                    {platformChoicesForForms.map((item) => (
                      <option key={`videos-platform-${item}`} value={item}>
                        {item === NO_PLATFORM_LABEL ? 'Pas de plateforme' : item}
                      </option>
                    ))}
                  </select>
                  <select
                    value={videoDraft.stage}
                    onChange={(event) =>
                      setVideoDraftField('stage', event.target.value as VideoStage)
                    }
                  >
                    <option value="idea">Idée</option>
                    <option value="scripting">Script</option>
                    <option value="recording">Tournage</option>
                    <option value="editing">Montage</option>
                    <option value="published">Publié</option>
                  </select>
                </div>
                {!isVideoDraftValid ? (
                  <p className={styles.planningFormHint} role="status">
                    Indiquez un titre, une date d&apos;échéance et une plateforme réelle (obligatoire —
                    pas l&apos;option « Pas de plateforme »).
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
                        : 'Titre, date et plateforme requis'
                    }
                    onClick={submitVideoDraft}
                  >
                    {editingVideoId ? 'Modifier le suivi vidéo' : 'Ajouter un suivi vidéo'}
                  </button>
                  {editingVideoId ? (
                    <button
                      type="button"
                      onClick={() => {
                        resetVideoDraft()
                        setIsVideoFormOpen(false)
                      }}
                    >
                      Annuler
                    </button>
                  ) : null}
                </div>
              </div>
              ) : null}
              <ul className={styles.list}>
                {filteredVideos.map((video) => {
                  const currentStage = videoStages[video.id] ?? video.stage
                  return (
                    <li
                      key={video.id}
                      data-search-id={toSearchTargetId('video', video.id)}
                      className={
                        highlightedItemId === toSearchTargetId('video', video.id) ? styles.itemPulse : ''
                      }
                    >
                      <strong>{video.title}</strong>
                      <span>
                      Plateforme: {highlightMatch(video.platform, search)} - Deadline:{' '}
                      {highlightMatch(video.deadline, search)}
                      </span>
                      <div className={styles.inlineControls}>
                        <label htmlFor={`stage-${video.id}`}>Étape :</label>
                        <span className={`${styles.stageBadge} ${styles[`stage_${currentStage}`]}`}>
                          {stageLabelMap[currentStage]}
                        </span>
                        <select
                          id={`stage-${video.id}`}
                          value={currentStage}
                          onChange={(event) =>
                            setVideoStage(video.id, event.target.value as VideoStage)
                          }
                        >
                          <option value="idea">Idée</option>
                          <option value="scripting">Script</option>
                          <option value="recording">Tournage</option>
                          <option value="editing">Montage</option>
                          <option value="published">Publié</option>
                        </select>
                        <div className={styles.videoItemActions}>
                          <button
                            type="button"
                            className={styles.iconActionButton}
                            data-tooltip="Modifier"
                            aria-label="Modifier la video"
                            onClick={() => startVideoEdit(video)}
                          >
                            <AiOutlineEdit aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            className={`${styles.iconActionButton} ${styles.deleteAction}`}
                            data-tooltip="Supprimer"
                            aria-label="Supprimer la video"
                            onClick={() => askVideoDelete(video)}
                          >
                            <AiOutlineDelete aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    </li>
                  )
                })}
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
            onDragStart={() => handlePanelDragStart('todo')}
            onDragOver={(event) => handlePanelDragOver(event, 'todo')}
            onDrop={() => handlePanelDrop('todo')}
            onDragEnd={handlePanelDragEnd}
            ref={(node) => {
              panelCardRefs.current.todo = node
            }}
          >
            <div className={styles.panelContent}>
              <div className={styles.panelHeader}>
                <h3>To-do list (Trello)</h3>
                <div className={styles.calendarHeaderActions}>
                  <button
                    type="button"
                    className={styles.panelExpandButton}
                    onClick={() => togglePanelCollapsed('todo')}
                    aria-label={collapsedPanels.todo ? 'Déplier la to-do list' : 'Réduire la to-do list'}
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
                    aria-label="Agrandir la todo list"
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
                  {isTodoFormOpen ? 'Masquer ajout tâche' : 'Ajouter une tâche'}
                </button>
              </div>
              {isTodoFormOpen ? (
              <div className={styles.todoForm}>
                <div className={styles.todoFormFields}>
                  <input
                    placeholder="Titre de la tâche"
                    value={todoDraft.label}
                    onChange={(event) => setTodoDraftField('label', event.target.value)}
                  />
                  <select
                    value={todoDraft.platform}
                    onChange={(event) => setTodoDraftField('platform', event.target.value)}
                  >
                    <option value="">Plateforme</option>
                    {platformChoicesForForms.map((item) => (
                      <option key={`todo-platform-${item}`} value={item}>
                        {item === NO_PLATFORM_LABEL ? 'Pas de plateforme' : item}
                      </option>
                    ))}
                  </select>
                  <select
                    value={todoDraft.priority}
                    onChange={(event) =>
                      setTodoDraftField('priority', event.target.value as 'low' | 'medium' | 'high')
                    }
                  >
                    <option value="low">low</option>
                    <option value="medium">medium</option>
                    <option value="high">high</option>
                  </select>
                  <select
                    value={todoDraft.column}
                    onChange={(event) =>
                      setTodoDraftField('column', event.target.value as TodoColumn)
                    }
                  >
                    <option value="todo">A faire</option>
                    <option value="doing">En cours</option>
                    <option value="done">Termine</option>
                  </select>
                </div>
                {!isTodoDraftValid ? (
                  <p className={styles.planningFormHint} role="status">
                    Indiquez un libellé et une plateforme réelle (obligatoire — pas « Pas de plateforme »).
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
                        : 'Libellé et plateforme requis'
                    }
                    onClick={submitTodoDraft}
                  >
                    {editingTodoId ? 'Modifier tâche' : 'Ajouter une tâche'}
                  </button>
                  {editingTodoId ? (
                    <button
                      type="button"
                      onClick={() => {
                        resetTodoDraft()
                        setIsTodoFormOpen(false)
                      }}
                    >
                      Annuler
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
                    onDrop={() => handleColumnDrop(column)}
                  >
                    <p className={styles.columnTitle}>
                      {column === 'todo' ? 'A faire' : column === 'doing' ? 'En cours' : 'Termine'}
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
                          onDragStart={() => handleTaskDragStart(task.id)}
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
                              data-tooltip="Modifier"
                              aria-label="Modifier la tâche"
                              onClick={() => startTodoEdit(task)}
                            >
                              <AiOutlineEdit aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              className={`${styles.iconActionButton} ${styles.deleteAction}`}
                              data-tooltip="Supprimer"
                              aria-label="Supprimer la tâche"
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
                                placeholder="Ajouter une checklist..."
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
                          <small className={styles.dragHint}>Glisser pour déplacer la carte</small>
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
            onDragStart={() => handlePanelDragStart('chart')}
            onDragOver={(event) => handlePanelDragOver(event, 'chart')}
            onDrop={() => handlePanelDrop('chart')}
            onDragEnd={handlePanelDragEnd}
            ref={(node) => {
              panelCardRefs.current.chart = node
            }}
          >
            <div className={styles.panelContent}>
              <div className={styles.panelHeader}>
                <h3>Tendances des stats</h3>
                <div className={styles.calendarHeaderActions}>
                  <button
                    type="button"
                    className={styles.panelExpandButton}
                    onClick={() => togglePanelCollapsed('chart')}
                    aria-label={collapsedPanels.chart ? 'Déplier le graphique' : 'Réduire le graphique'}
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
                    aria-label="Agrandir le graphique"
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
                        name="Vues totales"
                        stroke="#2563eb"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="engagement"
                        name="Engagement moyen"
                        stroke="#7c3aed"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Bar
                        yAxisId="left"
                        dataKey="publies"
                        name="Publié sur la période"
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
                  ? 'Planning (agenda)'
                  : focusedPanel === 'videos'
                    ? 'Suivi des vidéos'
                    : focusedPanel === 'todo'
                      ? 'To-do list (Trello)'
                      : 'Tendances des stats'}
              </h3>
              <div className={styles.calendarHeaderActions}>
                <button
                  type="button"
                  className={styles.panelExpandButton}
                  onClick={closeFocusedPanel}
                  aria-label="Fermer la modale"
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
                    {isPlanningFormOpen ? 'Masquer ajout événement' : 'Ajouter un événement'}
                  </button>
                  <div className={styles.monthNavigation}>
                    <button
                      type="button"
                      className={styles.monthNavButton}
                      onClick={goToPreviousMonth}
                      aria-label="Mois précédent"
                    >
                      ←
                    </button>
                    <span className={styles.monthLabel}>{displayedMonthLabel}</span>
                    <button
                      type="button"
                      className={styles.monthNavButton}
                      onClick={goToNextMonth}
                      aria-label="Mois suivant"
                    >
                      →
                    </button>
                  </div>
                </div>
                {isPlanningFormOpen ? (
                <div className={styles.planningForm}>
                  <div className={styles.planningFormFields}>
                    <input
                      placeholder="Titre de l'événement"
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
                      <option value="">Plateforme</option>
                      {platformChoicesForForms.map((item) => (
                        <option key={`modal-planning-platform-${item}`} value={item}>
                          {item === NO_PLATFORM_LABEL ? 'Pas de plateforme' : item}
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
                      <option value="draft">draft</option>
                      <option value="scheduled">scheduled</option>
                      <option value="published">published</option>
                    </select>
                  </div>
                  {!isPlanningDraftValid ? (
                    <p className={styles.planningFormHint} role="status">
                      Renseignez le titre, la date et une plateforme pour enregistrer.
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
                          : 'Titre, date et plateforme requis'
                      }
                      onClick={submitPlanningDraft}
                    >
                      {editingPlanningId ? "Modifier l'événement" : 'Ajouter un événement'}
                    </button>
                    {editingPlanningId ? (
                      <button
                        type="button"
                        onClick={() => {
                          resetPlanningDraft()
                          setIsPlanningFormOpen(false)
                        }}
                      >
                        Annuler
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
                          <small className={styles.emptyText}>Aucun contenu</small>
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
                                      data-tooltip="Modifier"
                                      aria-label="Modifier l'événement"
                                      onClick={() => startPlanningEdit(item)}
                                    >
                                      <AiOutlineEdit aria-hidden="true" />
                                    </button>
                                    <button
                                      type="button"
                                      className={`${styles.iconActionButton} ${styles.deleteAction}`}
                                      data-tooltip="Supprimer"
                                      aria-label="Supprimer l'événement"
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
                  {isVideoFormOpen ? 'Masquer ajout de suivi vidéo' : 'Ajouter un suivi vidéo'}
                </button>
              </div>
              {isVideoFormOpen ? (
              <div className={styles.videoForm}>
                <div className={styles.videoFormFields}>
                  <input
                    placeholder="Titre de la vidéo"
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
                    <option value="">Plateforme</option>
                    {platformChoicesForForms.map((item) => (
                      <option key={`modal-videos-platform-${item}`} value={item}>
                        {item === NO_PLATFORM_LABEL ? 'Pas de plateforme' : item}
                      </option>
                    ))}
                  </select>
                  <select
                    value={videoDraft.stage}
                    onChange={(event) =>
                      setVideoDraftField('stage', event.target.value as VideoStage)
                    }
                  >
                    <option value="idea">Idée</option>
                    <option value="scripting">Script</option>
                    <option value="recording">Tournage</option>
                    <option value="editing">Montage</option>
                    <option value="published">Publié</option>
                  </select>
                </div>
                {!isVideoDraftValid ? (
                  <p className={styles.planningFormHint} role="status">
                    Indiquez un titre, une date d&apos;échéance et une plateforme réelle (obligatoire —
                    pas l&apos;option « Pas de plateforme »).
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
                        : 'Titre, date et plateforme requis'
                    }
                    onClick={submitVideoDraft}
                  >
                    {editingVideoId ? 'Modifier le suivi vidéo' : 'Ajouter un suivi vidéo'}
                  </button>
                  {editingVideoId ? (
                    <button
                      type="button"
                      onClick={() => {
                        resetVideoDraft()
                        setIsVideoFormOpen(false)
                      }}
                    >
                      Annuler
                    </button>
                  ) : null}
                </div>
              </div>
              ) : null}
              <ul className={styles.list}>
                {filteredVideos.map((video) => {
                  const currentStage = videoStages[video.id] ?? video.stage
                  return (
                    <li
                      key={video.id}
                      data-search-id={toSearchTargetId('video', video.id)}
                      className={
                        highlightedItemId === toSearchTargetId('video', video.id) ? styles.itemPulse : ''
                      }
                    >
                      <strong>{video.title}</strong>
                      <span>
                        Plateforme: {highlightMatch(video.platform, search)} - Deadline:{' '}
                        {highlightMatch(video.deadline, search)}
                      </span>
                      <div className={styles.inlineControls}>
                        <label htmlFor={`modal-stage-${video.id}`}>Étape :</label>
                        <span className={`${styles.stageBadge} ${styles[`stage_${currentStage}`]}`}>
                          {stageLabelMap[currentStage]}
                        </span>
                        <select
                          id={`modal-stage-${video.id}`}
                          value={currentStage}
                          onChange={(event) =>
                            setVideoStage(video.id, event.target.value as VideoStage)
                          }
                        >
                          <option value="idea">Idée</option>
                          <option value="scripting">Script</option>
                          <option value="recording">Tournage</option>
                          <option value="editing">Montage</option>
                          <option value="published">Publié</option>
                        </select>
                        <div className={styles.videoItemActions}>
                          <button
                            type="button"
                            className={styles.iconActionButton}
                            data-tooltip="Modifier"
                            aria-label="Modifier la vidéo"
                            onClick={() => startVideoEdit(video)}
                          >
                            <AiOutlineEdit aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            className={`${styles.iconActionButton} ${styles.deleteAction}`}
                            data-tooltip="Supprimer"
                            aria-label="Supprimer la vidéo"
                            onClick={() => askVideoDelete(video)}
                          >
                            <AiOutlineDelete aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    </li>
                  )
                })}
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
                  {isTodoFormOpen ? 'Masquer ajout tâche' : 'Ajouter une tâche'}
                </button>
              </div>
              {isTodoFormOpen ? (
              <div className={styles.todoForm}>
                <div className={styles.todoFormFields}>
                  <input
                    placeholder="Titre de la tâche"
                    value={todoDraft.label}
                    onChange={(event) => setTodoDraftField('label', event.target.value)}
                  />
                  <select
                    value={todoDraft.platform}
                    onChange={(event) => setTodoDraftField('platform', event.target.value)}
                  >
                    <option value="">Plateforme</option>
                    {platformChoicesForForms.map((item) => (
                      <option key={`modal-todo-platform-${item}`} value={item}>
                        {item === NO_PLATFORM_LABEL ? 'Pas de plateforme' : item}
                      </option>
                    ))}
                  </select>
                  <select
                    value={todoDraft.priority}
                    onChange={(event) =>
                      setTodoDraftField('priority', event.target.value as 'low' | 'medium' | 'high')
                    }
                  >
                    <option value="low">low</option>
                    <option value="medium">medium</option>
                    <option value="high">high</option>
                  </select>
                  <select
                    value={todoDraft.column}
                    onChange={(event) =>
                      setTodoDraftField('column', event.target.value as TodoColumn)
                    }
                  >
                    <option value="todo">A faire</option>
                    <option value="doing">En cours</option>
                    <option value="done">Termine</option>
                  </select>
                </div>
                {!isTodoDraftValid ? (
                  <p className={styles.planningFormHint} role="status">
                    Indiquez un libellé et une plateforme réelle (obligatoire — pas « Pas de plateforme »).
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
                        : 'Libellé et plateforme requis'
                    }
                    onClick={submitTodoDraft}
                  >
                    {editingTodoId ? 'Modifier tâche' : 'Ajouter une tâche'}
                  </button>
                  {editingTodoId ? (
                    <button
                      type="button"
                      onClick={() => {
                        resetTodoDraft()
                        setIsTodoFormOpen(false)
                      }}
                    >
                      Annuler
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
                    onDrop={() => handleColumnDrop(column)}
                  >
                    <p className={styles.columnTitle}>
                      {column === 'todo' ? 'A faire' : column === 'doing' ? 'En cours' : 'Termine'}
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
                          onDragStart={() => handleTaskDragStart(task.id)}
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
                              data-tooltip="Modifier"
                              aria-label="Modifier la tâche"
                              onClick={() => startTodoEdit(task)}
                            >
                              <AiOutlineEdit aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              className={`${styles.iconActionButton} ${styles.deleteAction}`}
                              data-tooltip="Supprimer"
                              aria-label="Supprimer la tâche"
                              onClick={() => askTodoDelete(task)}
                            >
                              <AiOutlineDelete aria-hidden="true" />
                            </button>
                          </div>
                          <small>
                            {highlightMatch(task.platform, search)} -{' '}
                            {highlightMatch(task.priority, search)}
                          </small>
                          <small className={styles.dragHint}>Glisser pour déplacer la carte</small>
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
                      name="Vues totales"
                      stroke="#2563eb"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="engagement"
                      name="Engagement moyen"
                      stroke="#7c3aed"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Bar
                      yAxisId="left"
                      dataKey="publies"
                      name="Publié sur la période"
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
            aria-label="Confirmation de suppression"
          >
            <p className={styles.confirmText}>Êtes-vous sûr de vouloir supprimer ?</p>
            <p className={styles.confirmSubtext}>{planningToDelete.title}</p>
            <div className={styles.confirmActions}>
              <button type="button" onClick={cancelPlanningDelete}>
                Annuler
              </button>
              <button type="button" onClick={confirmPlanningDelete}>
                Supprimer
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
            aria-label="Confirmation de suppression de plateforme"
          >
            <p className={styles.confirmText}>Êtes-vous sûr de vouloir supprimer ?</p>
            <p className={styles.confirmSubtext}>{platformToDelete}</p>
            <div className={styles.confirmActions}>
              <button type="button" onClick={cancelPlatformDelete}>
                Annuler
              </button>
              <button type="button" onClick={confirmPlatformDelete}>
                Supprimer
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
            aria-label="Confirmation de suppression de vidéo"
          >
            <p className={styles.confirmText}>Êtes-vous sûr de vouloir supprimer ce suivi vidéo ?</p>
            <p className={styles.confirmSubtext}>{videoToDelete.title}</p>
            <div className={styles.confirmActions}>
              <button type="button" onClick={cancelVideoDelete}>
                Annuler
              </button>
              <button type="button" onClick={confirmVideoDelete}>
                Supprimer
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
            aria-label="Confirmation de suppression de tâche"
          >
            <p className={styles.confirmText}>Êtes-vous sûr de vouloir supprimer cette tâche ?</p>
            <p className={styles.confirmSubtext}>{todoToDelete.label}</p>
            <div className={styles.confirmActions}>
              <button type="button" onClick={cancelTodoDelete}>
                Annuler
              </button>
              <button type="button" onClick={confirmTodoDelete}>
                Supprimer
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </CreatorAppShell>
  )
}
