import { useDashboardData } from "../../../entities/dashboard/model/use-dashboard-data";
import {
  useDashboardPeriod,
  useDashboardPlatform,
  useSetDashboardPeriod,
  useSetDashboardPlatform,
} from "../../../features/dashboard-filters/model/dashboard-filters-store";
import {
  addPlanningItem,
  updatePlanningItem,
  deletePlanningItem as deletePlanningItemApi,
  renamePlatformInPlanning,
  deletePlatformInPlanning,
} from "../../../entities/dashboard/api/planning-api";
import {
  addVideoItem,
  updateVideoItem,
  deleteVideoItem as deleteVideoItemApi,
  reorderVideoItems,
  renamePlatformInVideos,
  deletePlatformInVideos,
} from "../../../entities/dashboard/api/videos-api";
import { planningStatusFromVideoStage } from "../../../entities/dashboard/api/video-planning-sync";
import {
  addTodoItem,
  updateTodoItem,
  deleteTodoItem as deleteTodoItemApi,
  renamePlatformInTodos,
  deletePlatformInTodos,
} from "../../../entities/dashboard/api/todos-api";
import { useAuthStore, selectAuthUser } from "../../../shared/model/auth-store";
import {
  addUserPlatform,
  renameUserPlatform,
  deleteUserPlatform,
} from "../../../entities/dashboard/api/platforms-api";
import styles from "./dashboard-overview.module.scss";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type DragEvent,
  type ReactNode,
  type TouchEvent,
} from "react";
import { createPortal } from "react-dom";
import {
  CartesianGrid,
  ComposedChart,
  Line,
  Area,
  Bar,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Link } from "react-router-dom";
import { AiOutlineDelete, AiOutlineEdit } from "react-icons/ai";
import {
  HiChevronDown,
  HiOutlineCalendarDays,
  HiOutlineCheckCircle,
  HiOutlineClock,
} from "react-icons/hi2";
import { gsap } from "gsap";
import { useProfileTitleSuffix } from "../../../features/account-profile";
import { useI18n } from "../../../shared/i18n";
import { CreatorAppShell } from "../../creator-app-shell";
import { AnimatedLoader } from "../../../shared/ui/AnimatedLoader";
import { useQueryClient } from "@tanstack/react-query";
import { toDateKey } from "../../../shared/lib/date-key";
import { mergeVisibleReorder, moveInArray } from "../../../shared/lib/reorder-list";

function BodyPortal({ children }: { children: ReactNode }) {
  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(children, document.body);
}

type TodoColumn = "todo" | "doing" | "done";
type VideoStage = "idea" | "scripting" | "recording" | "editing" | "published";
type PanelId = "planning" | "videos" | "todo" | "chart";
type SuggestionItem = {
  label: string;
  panel: PanelId;
  targetId: string | null;
  detail?: string;
  searchTerm?: string;
};

type PlanningItem = {
  id: string;
  title: string;
  platform: string;
  publishAt: string;
  status: "draft" | "scheduled" | "published";
  videoId?: string;
};

type PlanningDraft = {
  title: string;
  platform: string;
  publishAt: string;
  status: "draft" | "scheduled" | "published";
};

type VideoItem = {
  id: string;
  title: string;
  platform: string;
  stage: VideoStage;
  deadline: string;
  videoUrl?: string;
  coverImageUrl?: string;
  sortOrder?: number;
};

function compareVideoOrder(a: VideoItem, b: VideoItem): number {
  const ao = a.sortOrder ?? 0;
  const bo = b.sortOrder ?? 0;
  if (ao !== bo) return ao - bo;
  return a.deadline.localeCompare(b.deadline);
}

function getVideoThumbnailSrc(video: VideoItem): string {
  const trimmed = video.coverImageUrl?.trim();
  if (trimmed) return trimmed;
  return `https://placehold.co/144x96/e2e8f0/0f172a?text=${encodeURIComponent(
    video.title.slice(0, 14) || "Video",
  )}`;
}

type VideoDraft = {
  title: string;
  platform: string;
  deadline: string;
  stage: VideoStage;
  videoUrl: string;
  coverImageUrl: string;
};

type ChecklistItem = {
  id: string;
  text: string;
  done: boolean;
};

type BoardTask = {
  id: string;
  label: string;
  platform: string;
  priority: "low" | "medium" | "high";
  column: TodoColumn;
  checklist: ChecklistItem[];
  newChecklistText: string;
};

type TodoDraft = {
  label: string;
  platform: string;
  priority: "low" | "medium" | "high";
  column: TodoColumn;
};

const NO_PLATFORM_LABEL = "general";

function formatNumber(value: number, locale: string): string {
  return new Intl.NumberFormat(locale).format(value);
}

function formatDateLabel(dateString: string, locale: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString(locale, {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
}

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function normalizePlatformLabel(value: string): string {
  const normalized = value.trim().toLowerCase();
  return normalized || NO_PLATFORM_LABEL;
}

function parseDateSafe(dateString: string): Date {
  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(dateString);
  return new Date(isDateOnly ? `${dateString}T00:00:00` : dateString);
}

function toSearchTargetId(prefix: string, value: string): string {
  return `${prefix}-${encodeURIComponent(value)}`;
}

function findElementByDataSearchId(targetId: string): HTMLElement | null {
  const nodes = document.querySelectorAll<HTMLElement>("[data-search-id]");
  for (const el of nodes) {
    if (el.getAttribute("data-search-id") === targetId) return el;
  }
  return null;
}

function toMonthLabel(date: Date, locale: string): string {
  return date.toLocaleDateString(locale, {
    month: "long",
    year: "numeric",
  });
}

function highlightMatch(text: string, search: string): ReactNode {
  const needle = search.trim();
  if (!needle) return text;
  const lowerText = text.toLowerCase();
  const lowerNeedle = needle.toLowerCase();
  const index = lowerText.indexOf(lowerNeedle);
  if (index < 0) return text;
  const start = text.slice(0, index);
  const match = text.slice(index, index + needle.length);
  const end = text.slice(index + needle.length);
  return (
    <>
      {start}
      <mark>{match}</mark>
      {end}
    </>
  );
}

function isInPeriod(
  dateString: string,
  period: "7d" | "30d" | "90d" | "all",
): boolean {
  if (period === "all") return true;
  const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
  const today = new Date();
  const date = parseDateSafe(dateString);
  const start = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const end = new Date(start);
  end.setDate(end.getDate() + days);
  return date >= start && date <= end;
}

export function DashboardOverview() {
  const profileTitleSuffix = useProfileTitleSuffix();
  const user = useAuthStore(selectAuthUser);
  const { data, isLoading, isFetching, isError, error, refetch } =
    useDashboardData();
  const period = useDashboardPeriod();
  const platform = useDashboardPlatform();
  const setPeriod = useSetDashboardPeriod();
  const setPlatform = useSetDashboardPlatform();
  const queryClient = useQueryClient();

  const [focusedPanel, setFocusedPanel] = useState<null | PanelId>(null);
  const [highlightedPanel, setHighlightedPanel] = useState<null | PanelId>(
    null,
  );
  const [highlightedItemId, setHighlightedItemId] = useState<string | null>(
    null,
  );
  const [search, setSearch] = useState("");
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [newPlatformName, setNewPlatformName] = useState("");
  const [isAddingPlatform, setIsAddingPlatform] = useState(false);
  const [editingPlatformName, setEditingPlatformName] = useState<string | null>(
    null,
  );
  const [editingPlatformValue, setEditingPlatformValue] = useState("");
  const [platformToDelete, setPlatformToDelete] = useState<string | null>(null);
  const [planningData, setPlanningData] = useState<PlanningItem[]>([]);
  const [planningDraft, setPlanningDraft] = useState<PlanningDraft>({
    title: "",
    platform: "",
    publishAt: "",
    status: "draft",
  });
  const [editingPlanningId, setEditingPlanningId] = useState<string | null>(
    null,
  );
  const [isPlanningFormOpen, setIsPlanningFormOpen] = useState(false);
  const [planningToDelete, setPlanningToDelete] = useState<PlanningItem | null>(
    null,
  );
  const [draggingPlanningId, setDraggingPlanningId] = useState<string | null>(
    null,
  );
  const [dragOverDateKey, setDragOverDateKey] = useState<string | null>(null);
  const [draggingVideoRowIndex, setDraggingVideoRowIndex] = useState<
    number | null
  >(null);
  const [videoData, setVideoData] = useState<VideoItem[]>([]);
  const [videoDraft, setVideoDraft] = useState<VideoDraft>({
    title: "",
    platform: "",
    deadline: "",
    stage: "idea",
    videoUrl: "",
    coverImageUrl: "",
  });
  const [editingVideoId, setEditingVideoId] = useState<string | null>(null);
  const [isVideoFormOpen, setIsVideoFormOpen] = useState(false);
  const [isDashboardVideoFormOpen, setIsDashboardVideoFormOpen] =
    useState(false);
  const [videoSubmitError, setVideoSubmitError] = useState<string | null>(
    null,
  );
  const [todoBoard, setTodoBoard] = useState<BoardTask[]>([]);
  const [todoDraft, setTodoDraft] = useState<TodoDraft>({
    label: "",
    platform: "",
    priority: "medium",
    column: "todo",
  });
  const [editingTodoId, setEditingTodoId] = useState<string | null>(null);
  const [isTodoFormOpen, setIsTodoFormOpen] = useState(false);
  const [videoStages, setVideoStages] = useState<Record<string, VideoStage>>(
    {},
  );
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TodoColumn | null>(null);
  const [touchDragTaskId, setTouchDragTaskId] = useState<string | null>(null);
  const [touchOverColumn, setTouchOverColumn] = useState<TodoColumn | null>(
    null,
  );
  const [panelOrder, setPanelOrder] = useState<PanelId[]>([
    "planning",
    "videos",
    "todo",
    "chart",
  ]);
  const [draggingPanel, setDraggingPanel] = useState<PanelId | null>(null);
  const [dragOverPanel, setDragOverPanel] = useState<PanelId | null>(null);
  const [bootLoaderDone, setBootLoaderDone] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setBootLoaderDone(true);
    }, 650);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, []);
  const [collapsedPanels, setCollapsedPanels] = useState<
    Record<PanelId, boolean>
  >({
    planning: false,
    videos: false,
    todo: false,
    chart: false,
  });
  const [displayedMonthStart, setDisplayedMonthStart] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const panelCardRefs = useRef<Record<PanelId, HTMLElement | null>>({
    planning: null,
    videos: null,
    todo: null,
    chart: null,
  });
  const contentGridRef = useRef<HTMLElement | null>(null);
  const hasPlayedBentoIntro = useRef(false);

  const { t, localeTag } = useI18n();

  const statusLabel = useMemo(
    () => ({
      draft: t("dashboard.statusDraft"),
      scheduled: t("dashboard.statusScheduled"),
      published: t("dashboard.statusPublished"),
    }),
    [t],
  );

  const stageLabelMap = useMemo(
    () => ({
      idea: t("dashboard.stageIdea"),
      scripting: t("dashboard.stageScripting"),
      recording: t("dashboard.stageRecording"),
      editing: t("dashboard.stageEditing"),
      published: t("dashboard.stagePublished"),
    }),
    [t],
  );

  const columnLabel = useMemo(
    () => ({
      todo: t("dashboard.colTodo"),
      doing: t("dashboard.colDoing"),
      done: t("dashboard.colDone"),
    }),
    [t],
  );

  const panelLabels = useMemo(
    () => ({
      planning: t("dashboard.panelPlanning"),
      videos: t("dashboard.panelVideos"),
      todo: t("dashboard.panelTodo"),
      chart: t("dashboard.panelChart"),
    }),
    [t],
  );

  const priorityLabel = useMemo(
    () => ({
      low: t("dashboard.todoPriorityLow"),
      medium: t("dashboard.todoPriorityMedium"),
      high: t("dashboard.todoPriorityHigh"),
    }),
    [t],
  );

  /** Déduplique série Area + Line (même série) et affiche les noms i18n du graphique. */
  const chartTooltipContent = useCallback(
    (props: {
      active?: boolean;
      payload?: ReadonlyArray<{
        name?: string;
        dataKey?: string | number;
        value?: string | number;
      }>;
      label?: ReactNode;
    }) => {
      const { active, payload, label } = props;
      if (!active || !payload?.length) return null;
      const unique = new Map<string, (typeof payload)[number]>();
      for (const p of payload) {
        const key = String(p.name ?? p.dataKey);
        if (!unique.has(key)) unique.set(key, p);
      }
      return (
        <div
          style={{
            background: "#fff",
            padding: "8px 12px",
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            fontSize: 12,
          }}
        >
          <p style={{ margin: "0 0 6px", fontWeight: 600 }}>{label}</p>
          {Array.from(unique.values()).map((p) => (
            <p
              key={`${String(p.dataKey)}-${String(p.name)}`}
              style={{ margin: "4px 0 0" }}
            >
              <span style={{ color: "#6b7280" }}>{p.name}</span>
              {": "}
              {p.value}
            </p>
          ))}
        </div>
      );
    },
    [],
  );

  useEffect(() => {
    if (!data) return;
    setPlanningData(data.planning as PlanningItem[]);
    setVideoData(data.videos as VideoItem[]);
    setTodoBoard(
      data.todos.map((todo) => ({
        id: todo.id,
        label: todo.label,
        platform: normalizePlatformLabel(todo.platform),
        priority: todo.priority,
        column: todo.column ?? (todo.done ? "done" : "todo"),
        checklist: [],
        newChecklistText: "",
      })),
    );
    setVideoStages(
      Object.fromEntries(
        data.videos.map((video) => [video.id, video.stage]),
      ) as Record<string, VideoStage>,
    );

    const uniquePlatforms =
      data.platforms && data.platforms.length > 0
        ? data.platforms
        : Array.from(
            new Set([
              ...data.planning.map((item) => item.platform),
              ...data.videos.map((item) => item.platform),
              ...data.todos.map((item) => item.platform),
            ]),
          );
    setPlatforms(uniquePlatforms);
    setPlanningDraft((prev) => ({
      ...prev,
      platform: prev.platform || uniquePlatforms[0] || "",
    }));
    setVideoDraft((prev) => ({
      ...prev,
      platform: prev.platform || uniquePlatforms[0] || "",
    }));
    setTodoDraft((prev) => ({
      ...prev,
      platform: prev.platform || uniquePlatforms[0] || "",
    }));
  }, [data]);

  useEffect(() => {
    if (!focusedPanel && !planningToDelete && !platformToDelete) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [focusedPanel, planningToDelete, platformToDelete]);

  useEffect(() => {
    if (!bootLoaderDone || !data || hasPlayedBentoIntro.current) return;
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      hasPlayedBentoIntro.current = true;
      return;
    }

    const grid = contentGridRef.current;
    if (!grid) return;

    const cards = grid.querySelectorAll<HTMLElement>("[data-panel-card]");
    if (!cards.length) return;

    hasPlayedBentoIntro.current = true;

    gsap.fromTo(
      cards,
      { autoAlpha: 0, y: 26, scale: 0.985 },
      {
        autoAlpha: 1,
        y: 0,
        scale: 1,
        duration: 0.62,
        ease: "power3.out",
        stagger: 0.25,
      },
    );
  }, [bootLoaderDone, data]);

  const filteredPlanning = planningData
    .filter((item) => platform === "all" || item.platform === platform)
    .filter((item) => isInPeriod(item.publishAt, period));

  const filteredVideos = videoData
    .filter((item) => platform === "all" || item.platform === platform)
    .filter((item) => isInPeriod(item.deadline, period));

  const sortedFilteredVideos = useMemo(
    () => [...filteredVideos].sort(compareVideoOrder),
    [filteredVideos],
  );

  const filteredBoard = todoBoard.filter(
    (item) => platform === "all" || item.platform === platform,
  );

  const platformsForBanner = useMemo(() => {
    const fromItems = [
      ...planningData.map((i) => i.platform),
      ...videoData.map((i) => i.platform),
      ...todoBoard.map((t) => t.platform),
    ];
    return Array.from(new Set([...platforms, ...fromItems]));
  }, [platforms, planningData, videoData, todoBoard]);

  const searchSuggestions = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return [];

    const candidates: SuggestionItem[] = [];

    const push = (item: SuggestionItem) => candidates.push(item);

    push({ label: t("dashboard.searchKwPlanning"), panel: "planning", targetId: null });
    push({ label: t("dashboard.searchKwAgenda"), panel: "planning", targetId: null });
    push({ label: t("dashboard.searchKwVideoTracking"), panel: "videos", targetId: null });
    push({ label: t("dashboard.searchKwVideosShort"), panel: "videos", targetId: null });
    push({ label: t("dashboard.searchKwTodoList"), panel: "todo", targetId: null });
    push({ label: t("dashboard.searchKwTodoListAlt"), panel: "todo", targetId: null });
    push({ label: t("dashboard.searchKwTasks"), panel: "todo", targetId: null });
    push({ label: t("dashboard.searchKwPlatforms"), panel: "planning", targetId: null });
    push({ label: t("dashboard.searchKwStats"), panel: "planning", targetId: null });

    for (const item of planningData) {
      const targetId = toSearchTargetId("planning", item.id);
      push({
        label: item.title,
        panel: "planning",
        targetId,
        detail: statusLabel[item.status as keyof typeof statusLabel] ?? item.status,
      });
      push({
        label: item.platform,
        panel: "planning",
        targetId,
        detail: statusLabel[item.status as keyof typeof statusLabel] ?? item.status,
      });
      push({ label: item.status, panel: "planning", targetId });
    }
    for (const item of videoData) {
      const targetId = toSearchTargetId("video", item.id);
      push({
        label: item.title,
        panel: "videos",
        targetId,
        detail: stageLabelMap[item.stage as keyof typeof stageLabelMap] ?? item.stage,
      });
      push({
        label: item.platform,
        panel: "videos",
        targetId,
        detail: stageLabelMap[item.stage as keyof typeof stageLabelMap] ?? item.stage,
      });
      push({ label: item.stage, panel: "videos", targetId });
    }
    for (const item of todoBoard) {
      const targetId = toSearchTargetId("todo", item.id);
      push({
        label: item.label,
        panel: "todo",
        targetId,
        detail: columnLabel[item.column as keyof typeof columnLabel] ?? item.column,
      });
      push({
        label: item.platform,
        panel: "todo",
        targetId,
        detail: columnLabel[item.column as keyof typeof columnLabel] ?? item.column,
      });
      push({ label: item.priority, panel: "todo", targetId });
    }
    for (const item of platforms) {
      push({
        label: item,
        panel: "planning",
        targetId: toSearchTargetId("platform", item),
      });
    }

    const normQuery = normalizeText(query);
    const matching = candidates.filter((s) =>
      normalizeText(s.label).includes(normQuery),
    );

    const labelPanels = new Map<string, Set<PanelId>>();
    const labelCount = new Map<string, number>();
    const seen = new Set<string>();
    for (const s of matching) {
      const dedupeKey = `${normalizeText(s.label)}|${s.panel}|${s.targetId ?? "section"}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      const norm = normalizeText(s.label);
      labelCount.set(norm, (labelCount.get(norm) ?? 0) + 1);
      if (!labelPanels.has(norm)) labelPanels.set(norm, new Set());
      labelPanels.get(norm)!.add(s.panel);
    }

    const pool = new Map<string, SuggestionItem>();
    for (const s of matching) {
      const dedupeKey = `${normalizeText(s.label)}|${s.panel}|${s.targetId ?? "section"}`;
      if (pool.has(dedupeKey)) continue;

      const norm = normalizeText(s.label);
      const count = labelCount.get(norm) ?? 1;

      if (count <= 1) {
        pool.set(dedupeKey, s);
        continue;
      }

      const panels = labelPanels.get(norm)!;
      const panelLabel = panelLabels[s.panel];
      const rawLabel = s.label;

      const enrichedLabel =
        panels.size > 1
          ? `${rawLabel} — ${panelLabel}`
          : `${rawLabel} — ${panelLabel}${s.detail ? ` — ${s.detail}` : ""}`;

      pool.set(dedupeKey, { ...s, label: enrichedLabel, searchTerm: rawLabel });
    }

    return Array.from(pool.values()).slice(0, 8);
  }, [
    planningData,
    videoData,
    todoBoard,
    platforms,
    search,
    t,
    statusLabel,
    stageLabelMap,
    columnLabel,
    panelLabels,
  ]);

  /** Contenus au statut « publié » (agenda + suivi vidéo), selon filtres période / plateforme. */
  const totalViews =
    filteredPlanning.filter((i) => i.status === "published").length +
    filteredVideos.filter((v) => v.stage === "published").length;

  const engagement = useMemo(() => {
    if (filteredBoard.length > 0) {
      const done = filteredBoard.filter((t) => t.column === "done").length;
      return Math.round((done / filteredBoard.length) * 1000) / 10;
    }
    const denom = filteredPlanning.length + filteredVideos.length;
    if (denom === 0) return 0;
    const num =
      filteredPlanning.filter((i) => i.status === "published").length +
      filteredVideos.filter((v) => v.stage === "published").length;
    return Math.round((num / denom) * 1000) / 10;
  }, [filteredBoard, filteredPlanning, filteredVideos]);

  /** Créneaux agenda au statut publié ou planifié (filtres appliqués). */
  const publishedCount = filteredPlanning.filter(
    (item) => item.status === "published" || item.status === "scheduled",
  ).length;

  const displayedMonthLabel = toMonthLabel(displayedMonthStart, localeTag);

  const goToPreviousMonth = () => {
    setDisplayedMonthStart(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1),
    );
  };

  const goToNextMonth = () => {
    setDisplayedMonthStart(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1),
    );
  };

  const dateSlots = useMemo(() => {
    const year = displayedMonthStart.getFullYear();
    const month = displayedMonthStart.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, index) => {
      const slot = new Date(year, month, index + 1);
      const key = toDateKey(slot);
      return { key, label: formatDateLabel(key, localeTag) };
    });
  }, [displayedMonthStart, localeTag]);

  const planningByDate = useMemo(() => {
    const map = new Map<string, PlanningItem[]>();
    for (const slot of dateSlots) {
      map.set(
        slot.key,
        planningData.filter((item) => toDateKey(item.publishAt) === slot.key),
      );
    }
    return map;
  }, [dateSlots, planningData]);

  const handlePlanningDragStart = (event: React.DragEvent, itemId: string) => {
    event.stopPropagation();
    event.dataTransfer.setData("planningItemId", itemId);
    event.dataTransfer.effectAllowed = "move";
    setDraggingPlanningId(itemId);
  };

  const handlePlanningDragEnd = () => {
    setDraggingPlanningId(null);
    setDragOverDateKey(null);
  };

  const handleDateDragOver = (event: React.DragEvent, dateKey: string) => {
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "move";
    setDragOverDateKey(dateKey);
  };

  const handleDateDragLeave = (event: React.DragEvent) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node)) {
      setDragOverDateKey(null);
    }
  };

  const handleDateDrop = async (event: React.DragEvent, dateKey: string) => {
    event.preventDefault();
    event.stopPropagation();
    const itemId = event.dataTransfer.getData("planningItemId");
    if (!itemId || !user) {
      setDraggingPlanningId(null);
      setDragOverDateKey(null);
      return;
    }
    const item = planningData.find((p) => p.id === itemId);
    if (!item || toDateKey(item.publishAt) === dateKey) {
      setDraggingPlanningId(null);
      setDragOverDateKey(null);
      return;
    }
    setPlanningData((prev) =>
      prev.map((p) => (p.id === itemId ? { ...p, publishAt: dateKey } : p)),
    );
    setDraggingPlanningId(null);
    setDragOverDateKey(null);
    try {
      await updatePlanningItem(itemId, { publishAt: dateKey });
      if (item.videoId) {
        setVideoData((prev) =>
          prev.map((v) =>
            v.id === item.videoId ? { ...v, deadline: dateKey } : v,
          ),
        );
        await updateVideoItem(item.videoId, { deadline: dateKey });
      }
    } catch (error) {
      console.error(t("dashboard.dragEventError"), error);
      setPlanningData((prev) =>
        prev.map((p) =>
          p.id === itemId ? { ...p, publishAt: item.publishAt } : p,
        ),
      );
      if (item.videoId) {
        setVideoData((prev) =>
          prev.map((v) =>
            v.id === item.videoId ? { ...v, deadline: item.publishAt } : v,
          ),
        );
      }
    }
  };

  const handleVideoRowDragStart =
    (index: number) => (event: DragEvent<HTMLLIElement>) => {
      event.stopPropagation();
      event.dataTransfer.setData("text/plain", String(index));
      event.dataTransfer.effectAllowed = "move";
      setDraggingVideoRowIndex(index);
    };

  const handleVideoRowDragEnd = () => {
    setDraggingVideoRowIndex(null);
  };

  const handleVideoRowDragOver = (event: DragEvent<HTMLLIElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  };

  const handleVideoRowDrop =
    (visibleOrderedVideos: VideoItem[], dropIndex: number) =>
    (event: DragEvent<HTMLLIElement>) => {
      event.preventDefault();
      const from = Number(event.dataTransfer.getData("text/plain"));
      setDraggingVideoRowIndex(null);
      if (Number.isNaN(from) || from === dropIndex || !user?.id) return;

      const visibleIds = visibleOrderedVideos.map((v) => v.id);
      const newVis = moveInArray(visibleIds, from, dropIndex);
      const fullOrdered = [...videoData]
        .sort(compareVideoOrder)
        .map((v) => v.id);
      const newFull = mergeVisibleReorder(fullOrdered, visibleIds, newVis);
      const byId = new Map(videoData.map((v) => [v.id, v]));
      const next: VideoItem[] = newFull.map((id, index) => {
        const base = byId.get(id);
        if (!base) {
          throw new Error(`missing video ${id}`);
        }
        return { ...base, sortOrder: index };
      });
      setVideoData(next);
      reorderVideoItems(user.id, newFull)
        .then(() => {
          void queryClient.invalidateQueries({
            queryKey: ["dashboard", "overview", user.id],
          });
        })
        .catch(console.error);
    };

  const setTaskLabel = (id: string, label: string) => {
    setTodoBoard((prev) =>
      prev.map((task) => (task.id === id ? { ...task, label } : task)),
    );
  };

  const setTaskDraftChecklist = (id: string, value: string) => {
    setTodoBoard((prev) =>
      prev.map((task) =>
        task.id === id ? { ...task, newChecklistText: value } : task,
      ),
    );
  };

  const addChecklistItem = (id: string) => {
    setTodoBoard((prev) =>
      prev.map((task) => {
        if (task.id !== id) return task;
        const text = task.newChecklistText.trim();
        if (!text) return task;
        return {
          ...task,
          checklist: [
            ...task.checklist,
            { id: `${task.id}-${Date.now()}`, text, done: false },
          ],
          newChecklistText: "",
        };
      }),
    );
  };

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
    );
  };

  const moveTask = (id: string, target: TodoColumn) => {
    setTodoBoard((prev) =>
      prev.map((task) => (task.id === id ? { ...task, column: target } : task)),
    );
    updateTodoItem(id, { column: target }).catch(console.error);
  };

  const setTodoDraftField = <K extends keyof TodoDraft>(
    key: K,
    value: TodoDraft[K],
  ) => {
    setTodoDraft((prev) => ({ ...prev, [key]: value }));
  };

  const resetTodoDraft = () => {
    setTodoDraft({
      label: "",
      platform: platforms[0] ?? "",
      priority: "medium",
      column: "todo",
    });
    setEditingTodoId(null);
  };

  const submitTodoDraft = async () => {
    if (!todoDraft.label.trim() || !todoDraft.platform) return;
    setSearch("");
    if (platform !== "all" && platform !== todoDraft.platform) {
      setPlatform(todoDraft.platform);
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
      );
      updateTodoItem(editingTodoId, {
        label: todoDraft.label.trim(),
        platform: todoDraft.platform,
        priority: todoDraft.priority,
        column: todoDraft.column,
      }).catch(console.error);
      resetTodoDraft();
      setIsTodoFormOpen(false);
      return;
    }

    if (!user?.id) return;
    try {
      const created = await addTodoItem(user.id, {
        label: todoDraft.label.trim(),
        platform: todoDraft.platform,
        priority: todoDraft.priority,
        column: todoDraft.column,
      });
      addUserPlatform(user.id, created.platform).catch(console.error);
      const newTask: BoardTask = {
        id: created.id,
        label: created.label,
        platform: created.platform,
        priority: created.priority,
        column: created.column,
        checklist: [],
        newChecklistText: "",
      };
      setTodoBoard((prev) => [...prev, newTask]);
    } catch (error) {
      console.error(error);
    }
    resetTodoDraft();
    setIsTodoFormOpen(false);
  };

  const startTodoEdit = (task: BoardTask) => {
    setFocusedPanel("todo");
    setIsTodoFormOpen(true);
    setEditingTodoId(task.id);
    setTodoDraft({
      label: task.label,
      platform: task.platform,
      priority: task.priority,
      column: task.column,
    });
  };

  const deleteTodoItem = (id: string) => {
    setTodoBoard((prev) => prev.filter((task) => task.id !== id));
    if (editingTodoId === id) {
      resetTodoDraft();
    }
    deleteTodoItemApi(id).catch(console.error);
  };

  const handleTaskDragStart = (taskId: string) => {
    setDraggingTaskId(taskId);
  };

  const handleTaskDragEnd = () => {
    setDraggingTaskId(null);
    setDragOverColumn(null);
  };

  const handleColumnDragOver = (
    event: DragEvent<HTMLDivElement>,
    column: TodoColumn,
  ) => {
    event.preventDefault();
    setDragOverColumn(column);
  };

  const handleColumnDrop = (column: TodoColumn) => {
    if (draggingTaskId) {
      moveTask(draggingTaskId, column);
    }
    setDraggingTaskId(null);
    setDragOverColumn(null);
  };

  const handleTaskTouchStart = (taskId: string) => {
    setTouchDragTaskId(taskId);
  };

  const handleTaskTouchMove = (event: TouchEvent<HTMLDivElement>) => {
    if (!touchDragTaskId) return;
    const touch = event.touches[0];
    if (!touch) return;
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    const column = element
      ?.closest("[data-kanban-column]")
      ?.getAttribute("data-kanban-column") as TodoColumn | null;
    if (column === "todo" || column === "doing" || column === "done") {
      setTouchOverColumn(column);
    }
  };

  const handleTaskTouchEnd = () => {
    if (touchDragTaskId && touchOverColumn) {
      moveTask(touchDragTaskId, touchOverColumn);
    }
    setTouchDragTaskId(null);
    setTouchOverColumn(null);
  };

  const setVideoStage = (id: string, nextStage: VideoStage) => {
    setVideoStages((prev) => ({ ...prev, [id]: nextStage }));
    setVideoData((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, stage: nextStage } : item,
      ),
    );
    updateVideoItem(id, { stage: nextStage }).catch(console.error);
    const linkedPlanning = planningData.find((p) => p.videoId === id);
    if (linkedPlanning) {
      const nextStatus = planningStatusFromVideoStage(nextStage);
      setPlanningData((prev) =>
        prev.map((p) =>
          p.id === linkedPlanning.id ? { ...p, status: nextStatus } : p,
        ),
      );
      updatePlanningItem(linkedPlanning.id, { status: nextStatus }).catch(
        console.error,
      );
    }
  };

  const setVideoDraftField = <K extends keyof VideoDraft>(
    key: K,
    value: VideoDraft[K],
  ) => {
    setVideoDraft((prev) => ({ ...prev, [key]: value }));
  };

  const resetVideoDraft = () => {
    setVideoDraft({
      title: "",
      platform: platforms[0] ?? "",
      deadline: "",
      stage: "idea",
      videoUrl: "",
      coverImageUrl: "",
    });
    setEditingVideoId(null);
  };

  const submitVideoDraft = async () => {
    setVideoSubmitError(null);
    if (
      !videoDraft.title.trim() ||
      !videoDraft.platform ||
      !videoDraft.deadline
    ) {
      setVideoSubmitError(t("dashboard.videoSubmitRequired"));
      return;
    }
    const normalizedDate = toDateKey(videoDraft.deadline);
    const ensureVisibility = (eventPlatform: string, eventDate: string) => {
      const eventDateObj = parseDateSafe(eventDate);
      setDisplayedMonthStart(
        new Date(eventDateObj.getFullYear(), eventDateObj.getMonth(), 1),
      );
      setSearch("");
      if (platform !== "all" && platform !== eventPlatform) {
        setPlatform(eventPlatform);
      }
      if (!isInPeriod(eventDate, period)) {
        setPeriod("all");
      }
    };

    if (editingVideoId) {
      const videoUrl =
        videoDraft.stage === "published" ? videoDraft.videoUrl.trim() : "";
      const coverImageUrl = videoDraft.coverImageUrl.trim();
      const linkedPlanning = planningData.find(
        (p) => p.videoId === editingVideoId,
      );
      setVideoData((prev) =>
        prev.map((item) =>
          item.id === editingVideoId
            ? {
                ...item,
                title: videoDraft.title.trim(),
                platform: videoDraft.platform,
                deadline: normalizedDate,
                stage: videoDraft.stage,
                videoUrl: videoUrl || undefined,
                coverImageUrl: coverImageUrl || undefined,
              }
            : item,
        ),
      );
      setVideoStages((prev) => ({
        ...prev,
        [editingVideoId]: videoDraft.stage,
      }));
      updateVideoItem(editingVideoId, {
        title: videoDraft.title.trim(),
        platform: videoDraft.platform,
        deadline: normalizedDate,
        stage: videoDraft.stage,
        videoUrl,
        coverImageUrl,
      }).catch(console.error);
      if (linkedPlanning) {
        const nextStatus = planningStatusFromVideoStage(videoDraft.stage);
        setPlanningData((prev) =>
          prev.map((p) =>
            p.id === linkedPlanning.id
              ? {
                  ...p,
                  title: videoDraft.title.trim(),
                  platform: videoDraft.platform,
                  publishAt: normalizedDate,
                  status: nextStatus,
                }
              : p,
          ),
        );
        updatePlanningItem(linkedPlanning.id, {
          title: videoDraft.title.trim(),
          platform: videoDraft.platform,
          publishAt: normalizedDate,
          status: nextStatus,
        }).catch(console.error);
      }
      ensureVisibility(videoDraft.platform, normalizedDate);
      resetVideoDraft();
      setIsVideoFormOpen(false);
      setIsDashboardVideoFormOpen(false);
      return;
    }

    if (!user?.id) {
      setVideoSubmitError(t("dashboard.userUnknown"));
      return;
    }
    try {
      const videoUrl =
        videoDraft.stage === "published" ? videoDraft.videoUrl.trim() : "";
      const coverImageUrl = videoDraft.coverImageUrl.trim();
      const newVideo = await addVideoItem(user.id, {
        title: videoDraft.title.trim(),
        platform: videoDraft.platform,
        deadline: normalizedDate,
        stage: videoDraft.stage,
        ...(videoUrl ? { videoUrl } : {}),
        ...(coverImageUrl ? { coverImageUrl } : {}),
      });

      const newPlanningItem = await addPlanningItem(user.id, {
        title: newVideo.title,
        platform: newVideo.platform,
        publishAt: normalizedDate,
        status: planningStatusFromVideoStage(videoDraft.stage),
        videoId: newVideo.id,
      });

      addUserPlatform(user.id, newVideo.platform).catch(console.error);
      setVideoData((prev) => [...prev, newVideo]);
      setPlanningData((prev) => [...prev, newPlanningItem]);
      setVideoStages((prev) => ({ ...prev, [newVideo.id]: newVideo.stage }));
      ensureVisibility(newVideo.platform, newVideo.deadline);
      void queryClient.invalidateQueries({
        queryKey: ["dashboard", "overview", user.id],
      });
      resetVideoDraft();
      setIsVideoFormOpen(false);
      setIsDashboardVideoFormOpen(false);
    } catch (error) {
      console.error(error);
      setVideoSubmitError(
        error instanceof Error ? error.message : t("videos.errorSave"),
      );
    }
  };

  const startVideoEdit = (item: VideoItem) => {
    setFocusedPanel("videos");
    setIsDashboardVideoFormOpen(false);
    setIsVideoFormOpen(true);
    setEditingVideoId(item.id);
    setVideoDraft({
      title: item.title,
      platform: item.platform,
      deadline: toDateKey(item.deadline),
      stage: videoStages[item.id] ?? item.stage,
      videoUrl: item.videoUrl ?? "",
      coverImageUrl: item.coverImageUrl ?? "",
    });
  };

  const startVideoEditInline = (item: VideoItem) => {
    setFocusedPanel(null);
    setIsVideoFormOpen(false);
    setIsDashboardVideoFormOpen(true);
    setEditingVideoId(item.id);
    setVideoSubmitError(null);
    setVideoDraft({
      title: item.title,
      platform: item.platform,
      deadline: toDateKey(item.deadline),
      stage: videoStages[item.id] ?? item.stage,
      videoUrl: item.videoUrl ?? "",
      coverImageUrl: item.coverImageUrl ?? "",
    });
  };

  const deleteVideoItem = (id: string) => {
    const linkedPlanning = planningData.find((p) => p.videoId === id);
    setVideoData((prev) => prev.filter((item) => item.id !== id));
    setVideoStages((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    if (linkedPlanning) {
      setPlanningData((prev) =>
        prev.filter((item) => item.id !== linkedPlanning.id),
      );
      deletePlanningItemApi(linkedPlanning.id)
        .then(() => deleteVideoItemApi(id))
        .then(() => {
          if (user?.id) {
            void queryClient.invalidateQueries({
              queryKey: ["dashboard", "overview", user.id],
            });
          }
        })
        .catch(console.error);
    } else {
      deleteVideoItemApi(id)
        .then(() => {
          if (user?.id) {
            void queryClient.invalidateQueries({
              queryKey: ["dashboard", "overview", user.id],
            });
          }
        })
        .catch(console.error);
    }
    if (editingVideoId === id) {
      resetVideoDraft();
      setIsDashboardVideoFormOpen(false);
    }
  };

  const createPlatform = () => {
    const next = newPlatformName.trim().toLowerCase();
    if (!next || platforms.includes(next)) return;
    setPlatforms((prev) => [...prev, next]);
    setNewPlatformName("");
    setIsAddingPlatform(false);
    if (user?.id) addUserPlatform(user.id, next).catch(console.error);
  };

  const renamePlatform = (from: string, draftName: string) => {
    const to = draftName.trim().toLowerCase();
    if (!to || to === from || platforms.includes(to)) return;
    setPlatforms((prev) => prev.map((item) => (item === from ? to : item)));
    setPlanningData((prev) =>
      prev.map((item) =>
        item.platform === from ? { ...item, platform: to } : item,
      ),
    );
    setVideoData((prev) =>
      prev.map((item) =>
        item.platform === from ? { ...item, platform: to } : item,
      ),
    );
    setTodoBoard((prev) =>
      prev.map((item) =>
        item.platform === from ? { ...item, platform: to } : item,
      ),
    );
    if (platform === from) setPlatform(to);
    setEditingPlatformName(null);
    setEditingPlatformValue("");
    if (user?.id) {
      Promise.all([
        renameUserPlatform(user.id, from, to),
        renamePlatformInPlanning(user.id, from, to),
        renamePlatformInVideos(user.id, from, to),
        renamePlatformInTodos(user.id, from, to),
      ]).catch(console.error);
    }
  };

  const deletePlatform = (name: string) => {
    if (!platforms.includes(name)) return;
    const remaining = platforms.filter((item) => item !== name);
    const fallback = remaining[0] ?? "general";
    const nextPlatforms = remaining.length === 0 ? [fallback] : remaining;
    setPlatforms(nextPlatforms);
    setPlanningData((prev) =>
      prev.map((item) =>
        item.platform === name ? { ...item, platform: fallback } : item,
      ),
    );
    setVideoData((prev) =>
      prev.map((item) =>
        item.platform === name ? { ...item, platform: fallback } : item,
      ),
    );
    setTodoBoard((prev) =>
      prev.map((item) =>
        item.platform === name ? { ...item, platform: fallback } : item,
      ),
    );
    if (platform === name) setPlatform("all");
    if (editingPlatformName === name) {
      setEditingPlatformName(null);
      setEditingPlatformValue("");
    }
    if (user?.id) {
      Promise.all([
        deleteUserPlatform(user.id, name),
        deletePlatformInPlanning(user.id, name, fallback),
        deletePlatformInVideos(user.id, name, fallback),
        deletePlatformInTodos(user.id, name, fallback),
      ]).catch(console.error);
    }
  };

  const startPlatformEdit = (name: string) => {
    setEditingPlatformName(name);
    setEditingPlatformValue(name);
  };

  const cancelPlatformEdit = () => {
    setEditingPlatformName(null);
    setEditingPlatformValue("");
  };

  const askPlatformDelete = (name: string) => {
    setPlatformToDelete(name);
  };

  const cancelPlatformDelete = () => {
    setPlatformToDelete(null);
  };

  const confirmPlatformDelete = () => {
    if (!platformToDelete) return;
    deletePlatform(platformToDelete);
    setPlatformToDelete(null);
  };

  const setPlanningDraftField = <K extends keyof PlanningDraft>(
    key: K,
    value: PlanningDraft[K],
  ) => {
    setPlanningDraft((prev) => ({ ...prev, [key]: value }));
  };

  const resetPlanningDraft = () => {
    setPlanningDraft({
      title: "",
      platform: platforms[0] ?? "",
      publishAt: "",
      status: "draft",
    });
    setEditingPlanningId(null);
  };

  const submitPlanningDraft = async () => {
    if (
      !planningDraft.title.trim() ||
      !planningDraft.platform ||
      !planningDraft.publishAt
    )
      return;
    const normalizedDate = toDateKey(planningDraft.publishAt);
    const ensureVisibility = (eventPlatform: string, eventDate: string) => {
      const eventDateObj = parseDateSafe(eventDate);
      setDisplayedMonthStart(
        new Date(eventDateObj.getFullYear(), eventDateObj.getMonth(), 1),
      );
      setSearch("");
      if (platform !== "all" && platform !== eventPlatform) {
        setPlatform(eventPlatform);
      }
      if (!isInPeriod(eventDate, period)) {
        setPeriod("all");
      }
    };

    if (editingPlanningId) {
      const existing = planningData.find((p) => p.id === editingPlanningId);
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
      );
      updatePlanningItem(editingPlanningId, {
        title: planningDraft.title.trim(),
        platform: planningDraft.platform,
        publishAt: normalizedDate,
        status: planningDraft.status,
      }).catch(console.error);
      if (existing?.videoId) {
        setVideoData((prev) =>
          prev.map((v) =>
            v.id === existing.videoId
              ? {
                  ...v,
                  title: planningDraft.title.trim(),
                  platform: planningDraft.platform,
                  deadline: normalizedDate,
                }
              : v,
          ),
        );
        updateVideoItem(existing.videoId, {
          title: planningDraft.title.trim(),
          platform: planningDraft.platform,
          deadline: normalizedDate,
        }).catch(console.error);
      }
      ensureVisibility(planningDraft.platform, normalizedDate);
      resetPlanningDraft();
      setIsPlanningFormOpen(false);
      return;
    }

    if (!user?.id) return;
    try {
      const newItem = await addPlanningItem(user.id, {
        title: planningDraft.title.trim(),
        platform: planningDraft.platform,
        publishAt: normalizedDate,
        status: planningDraft.status,
      });
      addUserPlatform(user.id, newItem.platform).catch(console.error);
      setPlanningData((prev) => [...prev, newItem]);
      ensureVisibility(newItem.platform, newItem.publishAt);
    } catch (error) {
      console.error(error);
    }
    resetPlanningDraft();
    setIsPlanningFormOpen(false);
  };

  const startPlanningEdit = (item: PlanningItem) => {
    setFocusedPanel("planning");
    setIsPlanningFormOpen(true);
    setEditingPlanningId(item.id);
    setPlanningDraft({
      title: item.title,
      platform: item.platform,
      publishAt: toDateKey(item.publishAt),
      status: item.status,
    });
  };

  const deletePlanningItem = (id: string) => {
    const item = planningData.find((p) => p.id === id);
    setPlanningData((prev) => prev.filter((p) => p.id !== id));
    if (item?.videoId) {
      const videoId = item.videoId;
      setVideoData((prev) => prev.filter((v) => v.id !== videoId));
      setVideoStages((prev) => {
        const next = { ...prev };
        delete next[videoId];
        return next;
      });
      deletePlanningItemApi(id)
        .then(() => deleteVideoItemApi(videoId))
        .catch(console.error);
    } else {
      deletePlanningItemApi(id).catch(console.error);
    }
    if (editingPlanningId === id) {
      resetPlanningDraft();
    }
  };

  const askPlanningDelete = (item: PlanningItem) => {
    setPlanningToDelete(item);
  };

  const cancelPlanningDelete = () => {
    setPlanningToDelete(null);
  };

  const confirmPlanningDelete = () => {
    if (!planningToDelete) return;
    deletePlanningItem(planningToDelete.id);
    setPlanningToDelete(null);
  };

  const closeFocusedPanel = () => {
    setFocusedPanel(null);
    resetPlanningDraft();
    setIsPlanningFormOpen(false);
    resetVideoDraft();
    setIsVideoFormOpen(false);
    setIsDashboardVideoFormOpen(false);
    setVideoSubmitError(null);
    resetTodoDraft();
    setIsTodoFormOpen(false);
  };

  const toggleFocusedPanel = (panel: PanelId) => {
    if (focusedPanel === panel) {
      closeFocusedPanel();
    } else {
      setVideoSubmitError(null);
      setIsDashboardVideoFormOpen(false);
      setFocusedPanel(panel);
    }
  };

  const togglePanelCollapsed = (panel: PanelId) => {
    setCollapsedPanels((prev) => ({ ...prev, [panel]: !prev[panel] }));
  };

  const panelOrderIndex = useMemo(
    () => ({
      planning: panelOrder.indexOf("planning"),
      videos: panelOrder.indexOf("videos"),
      todo: panelOrder.indexOf("todo"),
      chart: panelOrder.indexOf("chart"),
    }),
    [panelOrder],
  );

  const isLastPanelSingle = panelOrder.length % 2 === 1;
  const lastPanel = panelOrder[panelOrder.length - 1];

  /** Séries du graphique : uniquement des comptages réels par jour (mois affiché). */
  const chartData = useMemo(() => {
    return dateSlots.map((slot) => {
      const publishedForDay = filteredPlanning.filter(
        (item) =>
          toDateKey(item.publishAt) === slot.key &&
          (item.status === "published" || item.status === "scheduled"),
      ).length;
      const publications =
        filteredPlanning.filter(
          (item) =>
            toDateKey(item.publishAt) === slot.key &&
            item.status === "published",
        ).length +
        filteredVideos.filter(
          (item) =>
            toDateKey(item.deadline) === slot.key &&
            item.stage === "published",
        ).length;
      const videosDue = filteredVideos.filter(
        (item) => toDateKey(item.deadline) === slot.key,
      ).length;

      return {
        label: formatDateLabel(slot.key, localeTag),
        publications,
        publies: publishedForDay,
        videosDue,
      };
    });
  }, [dateSlots, filteredPlanning, filteredVideos, localeTag]);

  const publishingProgress = Math.min(
    100,
    Math.round(
      (filteredPlanning.filter((i) => i.status === "published").length /
        Math.max(1, filteredPlanning.length)) *
        100,
    ),
  );
  const deliveryProgress = Math.min(
    100,
    Math.round(
      (filteredVideos.filter((v) => v.stage === "published").length /
        Math.max(1, filteredVideos.length)) *
        100,
    ),
  );

  const growthRatio = Number(
    ((publishingProgress + deliveryProgress) / 2).toFixed(2),
  );

  const platformBreakdown = useMemo(() => {
    const counts = new Map<string, { lessons: number; hours: number }>();
    const add = (
      platformName: string,
      lessonsDelta: number,
      hoursDelta: number,
    ) => {
      const current = counts.get(platformName) ?? { lessons: 0, hours: 0 };
      counts.set(platformName, {
        lessons: current.lessons + lessonsDelta,
        hours: current.hours + hoursDelta,
      });
    };

    filteredPlanning.forEach((item) => add(item.platform, 1, 2));
    filteredVideos.forEach((item) => add(item.platform, 1, 1));
    filteredBoard.forEach((item) =>
      add(item.platform, 0, item.column === "done" ? 2 : 1),
    );

    return Array.from(counts.entries())
      .map(([name, value]) => ({ name, ...value }))
      .sort((a, b) => b.lessons - a.lessons)
      .slice(0, 4);
  }, [filteredPlanning, filteredVideos, filteredBoard]);

  const videoRecapItems = useMemo(
    () => [...filteredVideos].sort(compareVideoOrder).slice(0, 3),
    [filteredVideos],
  );

  const videoStageRecap = useMemo(() => {
    return filteredVideos.reduce<Record<VideoStage, number>>(
      (acc, item) => {
        acc[item.stage] += 1;
        return acc;
      },
      {
        idea: 0,
        scripting: 0,
        recording: 0,
        editing: 0,
        published: 0,
      },
    );
  }, [filteredVideos]);

  const handlePanelDragStart = (panel: PanelId) => {
    setDraggingPanel(panel);
  };

  const handlePanelDragOver = (
    event: DragEvent<HTMLElement>,
    panel: PanelId,
  ) => {
    event.preventDefault();
    setDragOverPanel(panel);
  };

  const handlePanelDrop = (target: PanelId) => {
    if (!draggingPanel || draggingPanel === target) return;
    setPanelOrder((prev) => {
      const next = [...prev];
      const fromIndex = next.indexOf(draggingPanel);
      const targetIndex = next.indexOf(target);
      if (fromIndex < 0 || targetIndex < 0) return prev;
      next.splice(fromIndex, 1);
      next.splice(targetIndex, 0, draggingPanel);
      return next;
    });
    setDraggingPanel(null);
    setDragOverPanel(null);
  };

  const handlePanelDragEnd = () => {
    setDraggingPanel(null);
    setDragOverPanel(null);
  };

  const focusPanelFromSuggestion = (suggestion: SuggestionItem) => {
    const { panel, targetId } = suggestion;

    const HIGHLIGHT_MS = 4000;

    const scrollToTargetOrPanel = () => {
      if (targetId) {
        const target = findElementByDataSearchId(targetId);
        if (target) {
          target.scrollIntoView({ behavior: "smooth", block: "center" });
          setHighlightedItemId(null);
          requestAnimationFrame(() => {
            setHighlightedItemId(targetId);
          });
          window.setTimeout(() => {
            setHighlightedItemId((current) =>
              current === targetId ? null : current,
            );
          }, HIGHLIGHT_MS);
          return;
        }
      }

      const element = panelCardRefs.current[panel];
      if (!element) return;
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightedPanel(null);
      requestAnimationFrame(() => {
        setHighlightedPanel(panel);
      });
      window.setTimeout(() => {
        setHighlightedPanel((current) => (current === panel ? null : current));
      }, HIGHLIGHT_MS);
    };

    setCollapsedPanels((prev) =>
      prev[panel] ? { ...prev, [panel]: false } : prev,
    );

    window.setTimeout(scrollToTargetOrPanel, 100);
  };

  const shouldShowLoader =
    !bootLoaderDone || isLoading || (!data && isFetching);
  if (shouldShowLoader) return <AnimatedLoader />;
  if (isError || !data) {
    const detail =
      error instanceof Error ? error.message : error ? String(error) : "";
    const periodKeys = ["7d", "30d", "90d", "all"] as const;
    const errorPanels = [
      ["planning", styles.panelPlanning, t("dashboard.planningTitle")] as const,
      ["videos", styles.panelVideos, t("dashboard.panelVideosHeading")] as const,
      ["todo", styles.panelTodo, t("dashboard.todoTitle")] as const,
      ["chart", styles.panelChart, t("dashboard.statsTitle")] as const,
    ];
    return (
      <CreatorAppShell
        topBarTrailing={
          <div className={styles.searchBox}>
            <input
              className={styles.searchInput}
              placeholder={t("dashboard.searchPlaceholder")}
              disabled
              readOnly
              aria-disabled="true"
            />
          </div>
        }
      >
        <>
          <section className={styles.banner}>
            <h1>{t("dashboard.title", { suffix: profileTitleSuffix })}</h1>
            <p>{t("dashboard.bannerSubtitle")}</p>
            <div className={styles.bannerActions}>
              {periodKeys.map((item) => (
                <button
                  key={item}
                  type="button"
                  disabled
                  className={`${styles.filterButton} ${styles.filterButtonDisabled}`}
                >
                  <HiOutlineCalendarDays aria-hidden="true" />
                  {item === "all" ? t("dashboard.periodAll") : item}
                </button>
              ))}
              <button
                type="button"
                disabled
                className={`${styles.filterButton} ${styles.filterButtonDisabled}`}
              >
                {t("dashboard.allPlatforms")}
              </button>
            </div>
          </section>

          <div className={styles.loadErrorToolbar} role="alert">
            <p className={styles.dataLoadFailedMessage}>
              {t("dashboard.dataLoadFailed")}
            </p>
            {detail ? (
              <p className={styles.dataLoadFailedDetail}>{detail}</p>
            ) : null}
            <button
              type="button"
              className={styles.errorRetryButton}
              onClick={() => {
                void refetch();
              }}
            >
              {t("videos.retry")}
            </button>
          </div>

          <h2 className={styles.sectionTitle}>{t("dashboard.panelChart")}</h2>
          <section className={styles.statsGrid}>
            <article className={styles.statCard}>
              <span className={`${styles.statIcon} ${styles.statIconPurple}`}>
                <HiOutlineClock aria-hidden="true" />
              </span>
              <p className={styles.dataLoadFailedMessage}>
                {t("dashboard.dataLoadFailed")}
              </p>
            </article>
            <article className={styles.statCard}>
              <span className={`${styles.statIcon} ${styles.statIconPink}`}>
                <HiOutlineCheckCircle aria-hidden="true" />
              </span>
              <p className={styles.dataLoadFailedMessage}>
                {t("dashboard.dataLoadFailed")}
              </p>
            </article>
            <article className={styles.statCard}>
              <div className={styles.cardTopRow}>
                <p>{t("dashboard.statEngagementCardTitle")}</p>
                <span className={styles.positiveBadge}>—</span>
              </div>
              <p className={styles.dataLoadFailedMessage}>
                {t("dashboard.dataLoadFailed")}
              </p>
            </article>
            <article className={`${styles.statCard} ${styles.platformCard}`}>
              <h3>{t("dashboard.byPlatform")}</h3>
              <p className={styles.dataLoadFailedMessage}>
                {t("dashboard.dataLoadFailed")}
              </p>
            </article>
          </section>

          <section className={styles.contentGrid}>
            {errorPanels.map(([panelKey, panelClass, panelTitle]) => (
              <article
                key={panelKey}
                data-panel-card={panelKey}
                className={`${styles.panelCard} ${panelClass} ${styles.panelCardOpen}`}
              >
                <div className={styles.panelContent}>
                  <div className={styles.panelHeader}>
                    <h3>{panelTitle}</h3>
                  </div>
                  <p className={styles.dataLoadFailedMessage}>
                    {t("dashboard.dataLoadFailed")}
                  </p>
                </div>
              </article>
            ))}
          </section>
        </>
      </CreatorAppShell>
    );
  }

  return (
    <CreatorAppShell
      topBarTrailing={
        <>
          <div className={styles.searchBox}>
            <input
              className={styles.searchInput}
              placeholder={t("dashboard.searchPlaceholder")}
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setIsSuggestionsOpen(true);
              }}
              onFocus={() => setIsSuggestionsOpen(true)}
              onBlur={() => setTimeout(() => setIsSuggestionsOpen(false), 120)}
            />
            {isSuggestionsOpen && searchSuggestions.length > 0 ? (
              <div className={styles.searchSuggestions}>
                {searchSuggestions.map((item) => (
                  <button
                    key={`${item.searchTerm ?? item.label}-${item.panel}-${item.targetId ?? "section"}`}
                    type="button"
                    onClick={() => {
                      setSearch(item.searchTerm ?? item.label);
                      focusPanelFromSuggestion(item);
                      setIsSuggestionsOpen(false);
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
          <h1>{t("dashboard.title", { suffix: profileTitleSuffix })}</h1>
          <p>{t("dashboard.bannerSubtitle")}</p>
          <div className={styles.bannerActions}>
            {(["7d", "30d", "90d", "all"] as const).map((item) => (
              <button
                key={item}
                className={`${styles.filterButton} ${
                  period === item ? styles.filterButtonActive : ""
                }`}
                onClick={() => setPeriod(item)}
                type="button"
              >
                <HiOutlineCalendarDays aria-hidden="true" />
                {item === "all" ? t("dashboard.periodAll") : item}
              </button>
            ))}
            <button
              className={`${styles.filterButton} ${platform === "all" ? styles.filterButtonActive : ""}`}
              onClick={() => setPlatform("all")}
              type="button"
            >
              {t("dashboard.allPlatforms")}
            </button>
            {platformsForBanner
              .filter((p) => p !== NO_PLATFORM_LABEL)
              .map((item) => (
                <div
                  key={item}
                  data-search-id={toSearchTargetId("platform", item)}
                  className={`${styles.platformFilterItem} ${
                    highlightedItemId === toSearchTargetId("platform", item)
                      ? styles.itemPulse
                      : ""
                  }`}
                >
                  {editingPlatformName === item ? (
                    <>
                      <input
                        className={styles.platformChipInput}
                        value={editingPlatformValue}
                        onChange={(event) =>
                          setEditingPlatformValue(event.target.value)
                        }
                        onKeyDown={(event) => {
                          if (event.key === "Enter")
                            renamePlatform(item, editingPlatformValue);
                          if (event.key === "Escape") cancelPlatformEdit();
                        }}
                        autoFocus
                      />
                      <button
                        type="button"
                        className={styles.platformChipAction}
                        aria-label={t("dashboard.validateEdit", { name: item })}
                        onClick={() =>
                          renamePlatform(item, editingPlatformValue)
                        }
                      >
                        ✓
                      </button>
                      <button
                        type="button"
                        className={styles.platformChipAction}
                        aria-label={t("dashboard.cancelEdit")}
                        onClick={cancelPlatformEdit}
                      >
                        ×
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        className={`${styles.platformChipMain} ${
                          platform === item ? styles.platformChipMainActive : ""
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
                            data-tooltip={t("dashboard.edit")}
                            aria-label={t("dashboard.editPlatformItem", {
                              name: item,
                            })}
                            onClick={() => startPlatformEdit(item)}
                          >
                            <AiOutlineEdit aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            className={`${styles.platformChipAction} ${styles.deleteAction}`}
                            data-tooltip={t("dashboard.delete")}
                            aria-label={t("dashboard.deletePlatformItem", {
                              name: item,
                            })}
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
                  placeholder={t("dashboard.platformPlaceholder")}
                />
                <button type="button" onClick={createPlatform}>
                  {t("dashboard.ok")}
                </button>
              </div>
            ) : (
              <button
                type="button"
                className={styles.addPlatformButton}
                aria-label={t("dashboard.addPlatform")}
                onClick={() => setIsAddingPlatform(true)}
              >
                +
              </button>
            )}
          </div>
        </section>

        <h2 className={styles.sectionTitle}>{t("dashboard.panelChart")}</h2>
        <section className={styles.statsGrid}>
          <article className={styles.statCard}>
            <span className={`${styles.statIcon} ${styles.statIconPurple}`}>
              <HiOutlineClock aria-hidden="true" />
            </span>
            <strong>{formatNumber(totalViews, localeTag)}</strong>
            <p>{t("dashboard.totalViews")}</p>
          </article>
          <article className={styles.statCard}>
            <span className={`${styles.statIcon} ${styles.statIconPink}`}>
              <HiOutlineCheckCircle aria-hidden="true" />
            </span>
            <strong>{publishedCount}</strong>
            <p>{t("dashboard.statPublishedContent")}</p>
          </article>
          <article className={styles.statCard}>
            <div className={styles.cardTopRow}>
              <p>{t("dashboard.statEngagementCardTitle")}</p>
              <span className={styles.positiveBadge}>
                {t("dashboard.statGrowthBadge", {
                  n: String(growthRatio),
                })}
              </span>
            </div>
            <strong>{engagement}%</strong>
            <div className={styles.dualProgress} role="presentation">
              <div
                className={styles.progressPurple}
                style={{ width: `${publishingProgress}%` }}
              />
              <div
                className={styles.progressPink}
                style={{ width: `${deliveryProgress}%` }}
              />
            </div>
            <div className={styles.progressLabels}>
              <span>
                {t("dashboard.statPctPublished", {
                  n: String(publishingProgress),
                })}
              </span>
              <span>
                {t("dashboard.statPctDelivered", {
                  n: String(deliveryProgress),
                })}
              </span>
            </div>
          </article>
          <article className={`${styles.statCard} ${styles.platformCard}`}>
            <h3>{t("dashboard.byPlatform")}</h3>
            <ul className={styles.platformList}>
              {platformBreakdown.map((item) => (
                <li key={item.name}>
                  <span className={styles.platformLogo} aria-hidden="true">
                    {item.name.slice(0, 1).toUpperCase()}
                  </span>
                  <span className={styles.platformMeta}>
                    <strong>{item.name}</strong>
                    <small>
                      {t("dashboard.platformLessons", {
                        n: String(item.lessons),
                      })}
                    </small>
                  </span>
                  <span className={styles.platformHours}>{item.hours}h</span>
                </li>
              ))}
            </ul>
          </article>
        </section>

        <section ref={contentGridRef} className={styles.contentGrid}>
          <article
            data-panel-card="planning"
            className={`${styles.panelCard} ${styles.panelPlanning} ${
              highlightedPanel === "planning" ? styles.panelPulse : ""
            } ${styles.panelCardDraggable} ${
              draggingPanel === "planning" ? styles.panelCardDragging : ""
            } ${dragOverPanel === "planning" ? styles.panelCardDropTarget : ""} ${
              isLastPanelSingle && lastPanel === "planning"
                ? styles.panelFullWidth
                : ""
            } ${!collapsedPanels.planning ? styles.panelCardOpen : styles.panelCardCollapsed}`}
            style={{ order: panelOrderIndex.planning }}
            draggable
            onDragStart={() => handlePanelDragStart("planning")}
            onDragOver={(event) => handlePanelDragOver(event, "planning")}
            onDrop={() => handlePanelDrop("planning")}
            onDragEnd={handlePanelDragEnd}
            ref={(node) => {
              panelCardRefs.current.planning = node;
            }}
          >
            <div className={styles.panelContent}>
              <div className={styles.panelHeader}>
                <h3>{t("dashboard.planningTitle")}</h3>
                <div className={styles.calendarHeaderActions}>
                  <button
                    type="button"
                    className={styles.panelExpandButton}
                    onClick={() => togglePanelCollapsed("planning")}
                    aria-label={
                      collapsedPanels.planning
                        ? t("dashboard.expandPlanning")
                        : t("dashboard.collapsePlanning")
                    }
                  >
                    <HiChevronDown
                      className={`${styles.dropdownIcon} ${
                        collapsedPanels.planning
                          ? styles.dropdownChevronCollapsed
                          : ""
                      }`}
                      aria-hidden="true"
                    />
                  </button>
                  <button
                    type="button"
                    className={styles.panelExpandButton}
                    onClick={() => toggleFocusedPanel("planning")}
                    aria-label={t("dashboard.expandPlanningFull")}
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
                      {isPlanningFormOpen
                        ? t("dashboard.hideEventForm")
                        : t("dashboard.addEvent")}
                    </button>
                    <div className={styles.monthNavigation}>
                      <button
                        type="button"
                        className={styles.monthNavButton}
                        onClick={goToPreviousMonth}
                        aria-label={t("dashboard.prevMonth")}
                      >
                        ←
                      </button>
                      <span className={styles.monthLabel}>
                        {displayedMonthLabel}
                      </span>
                      <button
                        type="button"
                        className={styles.monthNavButton}
                        onClick={goToNextMonth}
                        aria-label={t("dashboard.nextMonth")}
                      >
                        →
                      </button>
                    </div>
                  </div>
                  {isPlanningFormOpen ? (
                    <div className={styles.planningForm}>
                      <div className={styles.planningFormFields}>
                        <input
                          placeholder={t("dashboard.eventTitlePlaceholder")}
                          value={planningDraft.title}
                          onChange={(event) =>
                            setPlanningDraftField("title", event.target.value)
                          }
                        />
                        <input
                          type="date"
                          value={planningDraft.publishAt}
                          onChange={(event) =>
                            setPlanningDraftField(
                              "publishAt",
                              event.target.value,
                            )
                          }
                        />
                        <select
                          value={planningDraft.platform}
                          onChange={(event) =>
                            setPlanningDraftField(
                              "platform",
                              event.target.value,
                            )
                          }
                        >
                          <option value="">{t("dashboard.platformSelect")}</option>
                          {platforms.map((item) => (
                            <option
                              key={`planning-platform-${item}`}
                              value={item}
                            >
                              {item}
                            </option>
                          ))}
                        </select>
                        <select
                          value={planningDraft.status}
                          onChange={(event) =>
                            setPlanningDraftField(
                              "status",
                              event.target.value as
                                | "draft"
                                | "scheduled"
                                | "published",
                            )
                          }
                        >
                          <option value="draft">{statusLabel.draft}</option>
                          <option value="scheduled">
                            {statusLabel.scheduled}
                          </option>
                          <option value="published">
                            {statusLabel.published}
                          </option>
                        </select>
                      </div>
                      <div className={styles.planningFormActions}>
                        <button type="button" onClick={submitPlanningDraft}>
                          {editingPlanningId
                            ? t("dashboard.editEvent")
                            : t("dashboard.addEvent")}
                        </button>
                        {editingPlanningId ? (
                          <button
                            type="button"
                            onClick={() => {
                              resetPlanningDraft();
                              setIsPlanningFormOpen(false);
                            }}
                          >
                            {t("dashboard.cancel")}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                  <div className={styles.agendaGrid}>
                    {dateSlots.map((slot) => {
                      const dayItems = planningByDate.get(slot.key) ?? [];
                      return (
                        <div
                          key={slot.key}
                          className={`${styles.agendaDay} ${dragOverDateKey === slot.key ? styles.agendaDayDropOver : ""}`}
                          onDragOver={(event) =>
                            handleDateDragOver(event, slot.key)
                          }
                          onDragLeave={handleDateDragLeave}
                          onDrop={(event) => handleDateDrop(event, slot.key)}
                        >
                          <p className={styles.agendaDate}>{slot.label}</p>
                          {dayItems.length === 0 ? (
                            <small className={styles.emptyText}>
                              {t("dashboard.emptyDay")}
                            </small>
                          ) : (
                            <ul className={styles.miniList}>
                              {dayItems.map((item) => (
                                <li
                                  key={item.id}
                                  draggable
                                  data-search-id={toSearchTargetId(
                                    "planning",
                                    item.id,
                                  )}
                                  className={`${styles.agendaItem} ${
                                    highlightedItemId ===
                                    toSearchTargetId("planning", item.id)
                                      ? styles.itemPulse
                                      : ""
                                  } ${draggingPlanningId === item.id ? styles.agendaItemDragging : ""}`}
                                  onDragStart={(event) =>
                                    handlePlanningDragStart(event, item.id)
                                  }
                                  onDragEnd={handlePlanningDragEnd}
                                >
                                  <span className={styles.agendaDot} />
                                  <div>
                                    <strong>
                                      {highlightMatch(item.title, search)}
                                    </strong>
                                    <small>
                                      {highlightMatch(item.platform, search)} -{" "}
                                      {highlightMatch(
                                        statusLabel[
                                          item.status as keyof typeof statusLabel
                                        ] ?? item.status,
                                        search,
                                      )}
                                    </small>
                                    <div className={styles.planningItemActions}>
                                      <button
                                        type="button"
                                        className={styles.iconActionButton}
                                        data-tooltip={t("dashboard.editTooltip")}
                                        aria-label={t("dashboard.editPlanningAria")}
                                        onClick={() => startPlanningEdit(item)}
                                      >
                                        <AiOutlineEdit aria-hidden="true" />
                                      </button>
                                      <button
                                        type="button"
                                        className={`${styles.iconActionButton} ${styles.deleteAction}`}
                                        data-tooltip={t("dashboard.deleteTooltip")}
                                        aria-label={t("dashboard.deletePlanningAria")}
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
                      );
                    })}
                  </div>
                </>
              ) : null}
            </div>
          </article>

          <article
            data-panel-card="videos"
            className={`${styles.panelCard} ${styles.panelVideos} ${
              highlightedPanel === "videos" ? styles.panelPulse : ""
            } ${styles.panelCardDraggable} ${
              draggingPanel === "videos" ? styles.panelCardDragging : ""
            } ${dragOverPanel === "videos" ? styles.panelCardDropTarget : ""} ${
              isLastPanelSingle && lastPanel === "videos"
                ? styles.panelFullWidth
                : ""
            } ${!collapsedPanels.videos ? styles.panelCardOpen : styles.panelCardCollapsed}`}
            style={{ order: panelOrderIndex.videos }}
            draggable
            onDragStart={() => handlePanelDragStart("videos")}
            onDragOver={(event) => handlePanelDragOver(event, "videos")}
            onDrop={() => handlePanelDrop("videos")}
            onDragEnd={handlePanelDragEnd}
            ref={(node) => {
              panelCardRefs.current.videos = node;
            }}
          >
            <div className={styles.panelContent}>
              <div className={styles.panelHeader}>
                <h3>{t("dashboard.panelVideosHeading")}</h3>
                <div className={styles.calendarHeaderActions}>
                  <button
                    type="button"
                    className={styles.panelExpandButton}
                    onClick={() => togglePanelCollapsed("videos")}
                    aria-label={
                      collapsedPanels.videos
                        ? t("dashboard.expandVideosPanel")
                        : t("dashboard.collapseVideosPanel")
                    }
                  >
                    <HiChevronDown
                      className={`${styles.dropdownIcon} ${
                        collapsedPanels.videos
                          ? styles.dropdownChevronCollapsed
                          : ""
                      }`}
                      aria-hidden="true"
                    />
                  </button>
                  <button
                    type="button"
                    className={styles.panelExpandButton}
                    onClick={() => toggleFocusedPanel("videos")}
                    aria-label={t("dashboard.expandVideosFull")}
                  >
                    ⤢
                  </button>
                </div>
              </div>
              {!collapsedPanels.videos ? (
                <>
                  <div className={styles.videoRecapHeader}>
                    <p>
                      {t("dashboard.videoRecapSummary", {
                        total: String(filteredVideos.length),
                        published: String(videoStageRecap.published),
                        inProgress: String(
                          videoStageRecap.editing +
                            videoStageRecap.recording +
                            videoStageRecap.scripting +
                            videoStageRecap.idea,
                        ),
                      })}
                    </p>
                    <Link to="/videos" className={styles.videoRecapLink}>
                      {t("dashboard.openVideosLink")}
                    </Link>
                  </div>
                  <div className={styles.dropdownRow}>
                    <button
                      type="button"
                      className={styles.dropdownTrigger}
                      onClick={() => {
                        setVideoSubmitError(null);
                        resetVideoDraft();
                        setIsDashboardVideoFormOpen((prev) => !prev);
                        setIsVideoFormOpen(false);
                      }}
                    >
                      {isDashboardVideoFormOpen
                        ? t("dashboard.hideFormShort")
                        : t("dashboard.addVideoInline")}
                    </button>
                  </div>
                  {isDashboardVideoFormOpen ? (
                    <div className={styles.videoForm}>
                      <div className={styles.videoFormFields}>
                        <input
                          placeholder={t("dashboard.videoTitlePlaceholder")}
                          value={videoDraft.title}
                          onChange={(event) =>
                            setVideoDraftField("title", event.target.value)
                          }
                        />
                        <input
                          type="date"
                          value={videoDraft.deadline}
                          onChange={(event) =>
                            setVideoDraftField("deadline", event.target.value)
                          }
                        />
                        <select
                          value={videoDraft.platform}
                          onChange={(event) =>
                            setVideoDraftField("platform", event.target.value)
                          }
                        >
                          <option value="">{t("dashboard.platformSelect")}</option>
                          {platforms.map((item) => (
                            <option
                              key={`dash-videos-platform-${item}`}
                              value={item}
                            >
                              {item}
                            </option>
                          ))}
                        </select>
                        <select
                          value={videoDraft.stage}
                          onChange={(event) =>
                            setVideoDraftField(
                              "stage",
                              event.target.value as VideoStage,
                            )
                          }
                        >
                          <option value="idea">{stageLabelMap.idea}</option>
                          <option value="scripting">
                            {stageLabelMap.scripting}
                          </option>
                          <option value="recording">
                            {stageLabelMap.recording}
                          </option>
                          <option value="editing">
                            {stageLabelMap.editing}
                          </option>
                          <option value="published">
                            {stageLabelMap.published}
                          </option>
                        </select>
                        <input
                          type="url"
                          className={styles.videoFormFieldFull}
                          placeholder={t("videos.coverPlaceholder")}
                          value={videoDraft.coverImageUrl}
                          onChange={(event) =>
                            setVideoDraftField(
                              "coverImageUrl",
                              event.target.value,
                            )
                          }
                        />
                        {videoDraft.stage === "published" ? (
                          <input
                            type="url"
                            className={styles.videoFormFieldFull}
                            placeholder={t("videos.publishedUrlPlaceholder")}
                            value={videoDraft.videoUrl}
                            onChange={(event) =>
                              setVideoDraftField("videoUrl", event.target.value)
                            }
                          />
                        ) : null}
                      </div>
                      <div className={styles.videoFormActions}>
                        <button type="button" onClick={submitVideoDraft}>
                          {editingVideoId
                            ? t("videos.modify")
                            : t("videos.add")}
                        </button>
                        {editingVideoId ? (
                          <button
                            type="button"
                            onClick={() => {
                              resetVideoDraft();
                              setIsDashboardVideoFormOpen(false);
                              setVideoSubmitError(null);
                            }}
                          >
                            {t("dashboard.cancel")}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                  {isDashboardVideoFormOpen && videoSubmitError ? (
                    <p className={styles.videoInlineError}>
                      {videoSubmitError}
                    </p>
                  ) : null}
                  {videoRecapItems.length > 0 ? (
                    <ul
                      className={styles.videoRecapList}
                      onDragOver={(event) => {
                        event.preventDefault();
                        event.dataTransfer.dropEffect = "move";
                      }}
                    >
                      {videoRecapItems.map((video, recapIndex) => (
                        <li
                          key={video.id}
                          draggable
                          onDragStart={handleVideoRowDragStart(recapIndex)}
                          onDragEnd={handleVideoRowDragEnd}
                          onDragOver={handleVideoRowDragOver}
                          onDrop={handleVideoRowDrop(
                            videoRecapItems,
                            recapIndex,
                          )}
                          data-search-id={toSearchTargetId("video", video.id)}
                          className={`${
                            highlightedItemId ===
                            toSearchTargetId("video", video.id)
                              ? styles.itemPulse
                              : ""
                          } ${
                            draggingVideoRowIndex === recapIndex
                              ? styles.videoRowDragging
                              : ""
                          }`.trim()}
                        >
                          <div className={styles.videoRecapRow}>
                            <img
                              className={styles.videoThumbMini}
                              src={getVideoThumbnailSrc(video)}
                              alt=""
                              draggable={false}
                              loading="lazy"
                            />
                            <div className={styles.videoRecapRowBody}>
                              <div className={styles.videoRecapRowText}>
                                <strong>{video.title}</strong>
                                <span>
                                  {video.platform} -{" "}
                                  {stageLabelMap[video.stage]} -{" "}
                                  {video.deadline}
                                </span>
                              </div>
                              <div
                                className={styles.videoRecapRowActions}
                                onPointerDown={(event) =>
                                  event.stopPropagation()
                                }
                              >
                              <button
                                type="button"
                                className={styles.iconActionButton}
                                data-tooltip={t("dashboard.editTooltip")}
                                aria-label={t("dashboard.editVideoAria")}
                                onClick={() => startVideoEditInline(video)}
                              >
                                <AiOutlineEdit aria-hidden="true" />
                              </button>
                              <button
                                type="button"
                                className={`${styles.iconActionButton} ${styles.deleteAction}`}
                                data-tooltip={t("dashboard.deleteTooltip")}
                                aria-label={t("dashboard.deleteVideoAriaShort")}
                                onClick={() => deleteVideoItem(video.id)}
                              >
                                <AiOutlineDelete aria-hidden="true" />
                              </button>
                            </div>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className={styles.videoRecapEmpty}>
                      {t("dashboard.videoRecapEmptyPeriod")}
                    </p>
                  )}
                </>
              ) : null}
            </div>
          </article>

          <article
            data-panel-card="todo"
            className={`${styles.panelCard} ${styles.panelTodo} ${
              highlightedPanel === "todo" ? styles.panelPulse : ""
            } ${styles.panelCardDraggable} ${
              draggingPanel === "todo" ? styles.panelCardDragging : ""
            } ${dragOverPanel === "todo" ? styles.panelCardDropTarget : ""} ${
              isLastPanelSingle && lastPanel === "todo"
                ? styles.panelFullWidth
                : ""
            } ${!collapsedPanels.todo ? styles.panelCardOpen : styles.panelCardCollapsed}`}
            style={{ order: panelOrderIndex.todo }}
            draggable
            onDragStart={() => handlePanelDragStart("todo")}
            onDragOver={(event) => handlePanelDragOver(event, "todo")}
            onDrop={() => handlePanelDrop("todo")}
            onDragEnd={handlePanelDragEnd}
            ref={(node) => {
              panelCardRefs.current.todo = node;
            }}
          >
            <div className={styles.panelContent}>
              <div className={styles.panelHeader}>
                <h3>{t("dashboard.todoTitle")}</h3>
                <div className={styles.calendarHeaderActions}>
                  <button
                    type="button"
                    className={styles.panelExpandButton}
                    onClick={() => togglePanelCollapsed("todo")}
                    aria-label={
                      collapsedPanels.todo
                        ? t("dashboard.expandTodoPanel")
                        : t("dashboard.collapseTodoPanel")
                    }
                  >
                    <HiChevronDown
                      className={`${styles.dropdownIcon} ${
                        collapsedPanels.todo
                          ? styles.dropdownChevronCollapsed
                          : ""
                      }`}
                      aria-hidden="true"
                    />
                  </button>
                  <button
                    type="button"
                    className={styles.panelExpandButton}
                    onClick={() => toggleFocusedPanel("todo")}
                    aria-label={t("dashboard.expandTodoFull")}
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
                      {isTodoFormOpen
                        ? t("dashboard.hideTaskForm")
                        : t("dashboard.addTask")}
                    </button>
                  </div>
                  {isTodoFormOpen ? (
                    <div className={styles.todoForm}>
                      <div className={styles.todoFormFields}>
                        <input
                          placeholder={t("dashboard.taskTitlePlaceholder")}
                          value={todoDraft.label}
                          onChange={(event) =>
                            setTodoDraftField("label", event.target.value)
                          }
                        />
                        <select
                          value={todoDraft.platform}
                          onChange={(event) =>
                            setTodoDraftField("platform", event.target.value)
                          }
                        >
                          <option value="">{t("dashboard.platformSelect")}</option>
                          {platforms.map((item) => (
                            <option key={`todo-platform-${item}`} value={item}>
                              {item}
                            </option>
                          ))}
                        </select>
                        <select
                          value={todoDraft.priority}
                          onChange={(event) =>
                            setTodoDraftField(
                              "priority",
                              event.target.value as "low" | "medium" | "high",
                            )
                          }
                        >
                          <option value="low">{priorityLabel.low}</option>
                          <option value="medium">{priorityLabel.medium}</option>
                          <option value="high">{priorityLabel.high}</option>
                        </select>
                        <select
                          value={todoDraft.column}
                          onChange={(event) =>
                            setTodoDraftField(
                              "column",
                              event.target.value as TodoColumn,
                            )
                          }
                        >
                          <option value="todo">{columnLabel.todo}</option>
                          <option value="doing">{columnLabel.doing}</option>
                          <option value="done">{columnLabel.done}</option>
                        </select>
                      </div>
                      <div className={styles.todoFormActions}>
                        <button type="button" onClick={submitTodoDraft}>
                          {editingTodoId
                            ? t("dashboard.editTask")
                            : t("dashboard.addTask")}
                        </button>
                        {editingTodoId ? (
                          <button
                            type="button"
                            onClick={() => {
                              resetTodoDraft();
                              setIsTodoFormOpen(false);
                            }}
                          >
                            {t("dashboard.cancel")}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                  <div className={styles.kanban}>
                    {(["todo", "doing", "done"] as const).map((column) => (
                      <div
                        key={column}
                        className={`${styles.kanbanColumn} ${
                          dragOverColumn === column ||
                          touchOverColumn === column
                            ? styles.kanbanColumnDropTarget
                            : ""
                        }`}
                        data-kanban-column={column}
                        onDragOver={(event) =>
                          handleColumnDragOver(event, column)
                        }
                        onDragLeave={() => setDragOverColumn(null)}
                        onDrop={() => handleColumnDrop(column)}
                      >
                        <p className={styles.columnTitle}>
                          {columnLabel[column]}
                        </p>
                        {filteredBoard
                          .filter((task) => task.column === column)
                          .map((task) => (
                            <div
                              key={task.id}
                              data-search-id={toSearchTargetId("todo", task.id)}
                              className={`${styles.taskCard} ${
                                draggingTaskId === task.id
                                  ? styles.taskCardDragging
                                  : ""
                              } ${
                                highlightedItemId ===
                                toSearchTargetId("todo", task.id)
                                  ? styles.itemPulse
                                  : ""
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
                                onChange={(event) =>
                                  setTaskLabel(task.id, event.target.value)
                                }
                              />
                              <div className={styles.taskItemActions}>
                                <button
                                  type="button"
                                  className={styles.iconActionButton}
                                  data-tooltip={t("dashboard.editTooltip")}
                                  aria-label={t("dashboard.editTaskAria")}
                                  onClick={() => startTodoEdit(task)}
                                >
                                  <AiOutlineEdit aria-hidden="true" />
                                </button>
                                <button
                                  type="button"
                                  className={`${styles.iconActionButton} ${styles.deleteAction}`}
                                  data-tooltip={t("dashboard.deleteTooltip")}
                                  aria-label={t("dashboard.deleteTaskAriaShort")}
                                  onClick={() => deleteTodoItem(task.id)}
                                >
                                  <AiOutlineDelete aria-hidden="true" />
                                </button>
                              </div>
                              <p className={styles.matchPreview}>
                                {highlightMatch(task.label, search)}
                              </p>
                              <small>
                                {highlightMatch(task.platform, search)} -{" "}
                                {highlightMatch(
                                  priorityLabel[
                                    task.priority as keyof typeof priorityLabel
                                  ] ?? task.priority,
                                  search,
                                )}
                              </small>
                              <div className={styles.checklistBox}>
                                {task.checklist.map((item) => (
                                  <label
                                    key={item.id}
                                    className={styles.checkItem}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={item.done}
                                      onChange={() =>
                                        toggleChecklistItem(task.id, item.id)
                                      }
                                    />
                                    <span
                                      className={
                                        item.done ? styles.checkItemDone : ""
                                      }
                                    >
                                      {item.text}
                                    </span>
                                  </label>
                                ))}
                                <div className={styles.checklistInputRow}>
                                  <input
                                    placeholder={t(
                                      "dashboard.addChecklistPlaceholder",
                                    )}
                                    value={task.newChecklistText}
                                    onChange={(event) =>
                                      setTaskDraftChecklist(
                                        task.id,
                                        event.target.value,
                                      )
                                    }
                                  />
                                  <button
                                    type="button"
                                    onClick={() => addChecklistItem(task.id)}
                                  >
                                    +
                                  </button>
                                </div>
                              </div>
                              <small className={styles.dragHint}>
                                {t("dashboard.dragCardHint")}
                              </small>
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
              highlightedPanel === "chart" ? styles.panelPulse : ""
            } ${styles.panelCardDraggable} ${
              draggingPanel === "chart" ? styles.panelCardDragging : ""
            } ${dragOverPanel === "chart" ? styles.panelCardDropTarget : ""} ${
              isLastPanelSingle && lastPanel === "chart"
                ? styles.panelFullWidth
                : ""
            } ${!collapsedPanels.chart ? styles.panelCardOpen : styles.panelCardCollapsed}`}
            style={{ order: panelOrderIndex.chart }}
            draggable
            onDragStart={() => handlePanelDragStart("chart")}
            onDragOver={(event) => handlePanelDragOver(event, "chart")}
            onDrop={() => handlePanelDrop("chart")}
            onDragEnd={handlePanelDragEnd}
            ref={(node) => {
              panelCardRefs.current.chart = node;
            }}
          >
            <div className={styles.panelContent}>
              <div className={styles.panelHeader}>
                <h3>{t("dashboard.statsTitle")}</h3>
                <div className={styles.calendarHeaderActions}>
                  <button
                    type="button"
                    className={styles.panelExpandButton}
                    onClick={() => togglePanelCollapsed("chart")}
                    aria-label={
                      collapsedPanels.chart
                        ? t("dashboard.expandChartPanel")
                        : t("dashboard.collapseChartPanel")
                    }
                  >
                    <HiChevronDown
                      className={`${styles.dropdownIcon} ${
                        collapsedPanels.chart
                          ? styles.dropdownChevronCollapsed
                          : ""
                      }`}
                      aria-hidden="true"
                    />
                  </button>
                  <button
                    type="button"
                    className={styles.panelExpandButton}
                    onClick={() => toggleFocusedPanel("chart")}
                    aria-label={t("dashboard.expandChartFull")}
                  >
                    ⤢
                  </button>
                </div>
              </div>
              {!collapsedPanels.chart ? (
                <div className={styles.chartCenterArea}>
                  <div className={styles.chartWrap}>
                    <ResponsiveContainer width="100%" height={340}>
                      <ComposedChart data={chartData}>
                        <defs>
                          <linearGradient
                            id="publicationsAreaGradient"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor="#5b4fcf"
                              stopOpacity={0.2}
                            />
                            <stop
                              offset="100%"
                              stopColor="#ffffff"
                              stopOpacity={0.02}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          vertical={false}
                          stroke="#e5e7eb"
                          strokeDasharray="2 6"
                        />
                        <XAxis
                          axisLine={false}
                          tickLine={false}
                          dataKey="label"
                          tick={{ fontSize: 11, fill: "#6b7280" }}
                        />
                        <YAxis
                          yAxisId="left"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 11, fill: "#9ca3af" }}
                        />
                        <YAxis
                          yAxisId="right"
                          axisLine={false}
                          tickLine={false}
                          orientation="right"
                          tick={{ fontSize: 11, fill: "#9ca3af" }}
                        />
                        <Tooltip
                          content={
                            chartTooltipContent as ComponentProps<
                              typeof Tooltip
                            >["content"]
                          }
                        />
                        <Area
                          yAxisId="left"
                          type="monotone"
                          dataKey="publications"
                          name={t("dashboard.chartSeriesPublications")}
                          stroke="none"
                          fill="url(#publicationsAreaGradient)"
                        />
                        <Line
                          yAxisId="left"
                          type="monotone"
                          dataKey="publications"
                          name={t("dashboard.chartSeriesPublications")}
                          stroke="#5b4fcf"
                          strokeWidth={3}
                          dot={false}
                        />
                        <Bar
                          yAxisId="left"
                          dataKey="publies"
                          name={t("dashboard.chartSeriesAgendaSlots")}
                          radius={[8, 8, 0, 0]}
                          barSize={14}
                        >
                          {chartData.map((item, index) => (
                            <Cell
                              key={`pub-${item.label}`}
                              fill={
                                index === chartData.length - 1
                                  ? "#5b4fcf"
                                  : "#c8c2ef"
                              }
                            />
                          ))}
                        </Bar>
                        <Bar
                          yAxisId="right"
                          dataKey="videosDue"
                          name={t("dashboard.chartSeriesVideosDue")}
                          fill="#e8a0d0"
                          radius={[8, 8, 0, 0]}
                          barSize={10}
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
        <BodyPortal>
          <div
            className={styles.simpleModalOverlay}
            onClick={closeFocusedPanel}
            role="presentation"
          >
            <div
              className={`${styles.simpleModalCard} ${
                focusedPanel === "planning"
                  ? styles.modalCardPlanning
                  : focusedPanel === "videos"
                    ? styles.modalCardVideos
                    : focusedPanel === "todo"
                      ? styles.modalCardTodo
                      : styles.modalCardChart
              }`}
              onClick={(event) => event.stopPropagation()}
              role="dialog"
              aria-modal="true"
            >
              <div className={styles.panelHeader}>
                <h3>
                  {focusedPanel === "planning"
                    ? t("dashboard.planningTitle")
                    : focusedPanel === "videos"
                      ? t("dashboard.videosTitle")
                      : focusedPanel === "todo"
                        ? t("dashboard.todoTitle")
                        : t("dashboard.statsTitle")}
                </h3>
                <div className={styles.calendarHeaderActions}>
                  <button
                    type="button"
                    className={styles.panelExpandButton}
                    onClick={closeFocusedPanel}
                    aria-label={t("dashboard.closeModal")}
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className={styles.modalContent}>
                {focusedPanel === "planning" ? (
                  <>
                    <div className={styles.planningToolbar}>
                      <button
                        type="button"
                        className={styles.dropdownTrigger}
                        onClick={() => setIsPlanningFormOpen((prev) => !prev)}
                      >
                        {isPlanningFormOpen
                          ? t("dashboard.hideEventForm")
                          : t("dashboard.addEvent")}
                      </button>
                      <div className={styles.monthNavigation}>
                        <button
                          type="button"
                          className={styles.monthNavButton}
                          onClick={goToPreviousMonth}
                          aria-label={t("dashboard.prevMonth")}
                        >
                          ←
                        </button>
                        <span className={styles.monthLabel}>
                          {displayedMonthLabel}
                        </span>
                        <button
                          type="button"
                          className={styles.monthNavButton}
                          onClick={goToNextMonth}
                          aria-label={t("dashboard.nextMonth")}
                        >
                          →
                        </button>
                      </div>
                    </div>
                    {isPlanningFormOpen ? (
                      <div className={styles.planningForm}>
                        <div className={styles.planningFormFields}>
                          <input
                            placeholder={t("dashboard.eventTitlePlaceholder")}
                            value={planningDraft.title}
                            onChange={(event) =>
                              setPlanningDraftField("title", event.target.value)
                            }
                          />
                          <input
                            type="date"
                            value={planningDraft.publishAt}
                            onChange={(event) =>
                              setPlanningDraftField(
                                "publishAt",
                                event.target.value,
                              )
                            }
                          />
                          <select
                            value={planningDraft.platform}
                            onChange={(event) =>
                              setPlanningDraftField(
                                "platform",
                                event.target.value,
                              )
                            }
                          >
                            <option value="">{t("dashboard.platformSelect")}</option>
                            {platforms.map((item) => (
                              <option
                                key={`modal-planning-platform-${item}`}
                                value={item}
                              >
                                {item}
                              </option>
                            ))}
                          </select>
                          <select
                            value={planningDraft.status}
                            onChange={(event) =>
                              setPlanningDraftField(
                                "status",
                                event.target.value as
                                  | "draft"
                                  | "scheduled"
                                  | "published",
                              )
                            }
                          >
                            <option value="draft">{statusLabel.draft}</option>
                            <option value="scheduled">
                              {statusLabel.scheduled}
                            </option>
                            <option value="published">
                              {statusLabel.published}
                            </option>
                          </select>
                        </div>
                        <div className={styles.planningFormActions}>
                          <button type="button" onClick={submitPlanningDraft}>
                            {editingPlanningId
                              ? t("dashboard.editEvent")
                              : t("dashboard.addEvent")}
                          </button>
                          {editingPlanningId ? (
                            <button
                              type="button"
                              onClick={() => {
                                resetPlanningDraft();
                                setIsPlanningFormOpen(false);
                              }}
                            >
                              {t("dashboard.cancel")}
                            </button>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                    <div className={styles.agendaGrid}>
                      {dateSlots.map((slot) => {
                        const dayItems = planningByDate.get(slot.key) ?? [];
                        return (
                          <div
                            key={slot.key}
                            className={`${styles.agendaDay} ${dragOverDateKey === slot.key ? styles.agendaDayDropOver : ""}`}
                            onDragOver={(event) =>
                              handleDateDragOver(event, slot.key)
                            }
                            onDragLeave={handleDateDragLeave}
                            onDrop={(event) => handleDateDrop(event, slot.key)}
                          >
                            <p className={styles.agendaDate}>{slot.label}</p>
                            {dayItems.length === 0 ? (
                              <small className={styles.emptyText}>
                                {t("dashboard.emptyDay")}
                              </small>
                            ) : (
                              <ul className={styles.miniList}>
                                {dayItems.map((item) => (
                                  <li
                                    key={item.id}
                                    draggable
                                    data-search-id={toSearchTargetId(
                                      "planning",
                                      item.id,
                                    )}
                                    className={`${styles.agendaItem} ${
                                      highlightedItemId ===
                                      toSearchTargetId("planning", item.id)
                                        ? styles.itemPulse
                                        : ""
                                    } ${draggingPlanningId === item.id ? styles.agendaItemDragging : ""}`}
                                    onDragStart={(event) =>
                                      handlePlanningDragStart(event, item.id)
                                    }
                                    onDragEnd={handlePlanningDragEnd}
                                  >
                                    <span className={styles.agendaDot} />
                                    <div>
                                      <strong>
                                        {highlightMatch(item.title, search)}
                                      </strong>
                                      <small>
                                        {highlightMatch(item.platform, search)}{" "}
                                        -{" "}
                                        {highlightMatch(
                                          statusLabel[
                                            item.status as keyof typeof statusLabel
                                          ] ?? item.status,
                                          search,
                                        )}
                                      </small>
                                      <div
                                        className={styles.planningItemActions}
                                      >
                                        <button
                                          type="button"
                                          className={styles.iconActionButton}
                                          data-tooltip={t(
                                            "dashboard.editTooltip",
                                          )}
                                          aria-label={t(
                                            "dashboard.editPlanningAria",
                                          )}
                                          onClick={() =>
                                            startPlanningEdit(item)
                                          }
                                        >
                                          <AiOutlineEdit aria-hidden="true" />
                                        </button>
                                        <button
                                          type="button"
                                          className={`${styles.iconActionButton} ${styles.deleteAction}`}
                                          data-tooltip={t(
                                            "dashboard.deleteTooltip",
                                          )}
                                          aria-label={t(
                                            "dashboard.deletePlanningAria",
                                          )}
                                          onClick={() =>
                                            askPlanningDelete(item)
                                          }
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
                        );
                      })}
                    </div>
                  </>
                ) : null}

                {focusedPanel === "videos" ? (
                  <>
                    <div className={styles.dropdownRow}>
                      <button
                        type="button"
                        className={styles.dropdownTrigger}
                        onClick={() => {
                          setVideoSubmitError(null);
                          if (!isVideoFormOpen) {
                            resetVideoDraft();
                          }
                          setIsVideoFormOpen((prev) => !prev);
                          setIsDashboardVideoFormOpen(false);
                        }}
                      >
                        {isVideoFormOpen
                          ? t("dashboard.hideVideoForm")
                          : t("dashboard.addVideoTracking")}
                      </button>
                    </div>
                    {isVideoFormOpen ? (
                      <div className={styles.videoForm}>
                        <div className={styles.videoFormFields}>
                          <input
                            placeholder={t("dashboard.videoTitlePlaceholder")}
                            value={videoDraft.title}
                            onChange={(event) =>
                              setVideoDraftField("title", event.target.value)
                            }
                          />
                          <input
                            type="date"
                            value={videoDraft.deadline}
                            onChange={(event) =>
                              setVideoDraftField("deadline", event.target.value)
                            }
                          />
                          <select
                            value={videoDraft.platform}
                            onChange={(event) =>
                              setVideoDraftField("platform", event.target.value)
                            }
                          >
                            <option value="">{t("dashboard.platformSelect")}</option>
                            {platforms.map((item) => (
                              <option
                                key={`modal-videos-platform-${item}`}
                                value={item}
                              >
                                {item}
                              </option>
                            ))}
                          </select>
                          <select
                            value={videoDraft.stage}
                            onChange={(event) =>
                              setVideoDraftField(
                                "stage",
                                event.target.value as VideoStage,
                              )
                            }
                          >
                            <option value="idea">{stageLabelMap.idea}</option>
                            <option value="scripting">
                              {stageLabelMap.scripting}
                            </option>
                            <option value="recording">
                              {stageLabelMap.recording}
                            </option>
                            <option value="editing">
                              {stageLabelMap.editing}
                            </option>
                            <option value="published">
                              {stageLabelMap.published}
                            </option>
                          </select>
                          <input
                            type="url"
                            className={styles.videoFormFieldFull}
                            placeholder={t("videos.coverPlaceholder")}
                            value={videoDraft.coverImageUrl}
                            onChange={(event) =>
                              setVideoDraftField(
                                "coverImageUrl",
                                event.target.value,
                              )
                            }
                          />
                          {videoDraft.stage === "published" ? (
                            <input
                              type="url"
                              className={styles.videoFormFieldFull}
                              placeholder={t("videos.publishedUrlPlaceholder")}
                              value={videoDraft.videoUrl}
                              onChange={(event) =>
                                setVideoDraftField("videoUrl", event.target.value)
                              }
                            />
                          ) : null}
                        </div>
                        <div className={styles.videoFormActions}>
                          <button type="button" onClick={submitVideoDraft}>
                            {editingVideoId
                              ? t("dashboard.editVideo")
                              : t("dashboard.addVideoTracking")}
                          </button>
                          {editingVideoId ? (
                            <button
                              type="button"
                              onClick={() => {
                                resetVideoDraft();
                                setIsVideoFormOpen(false);
                                setVideoSubmitError(null);
                              }}
                            >
                              {t("dashboard.cancel")}
                            </button>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                    {videoSubmitError ? (
                      <p className={styles.videoInlineError}>
                        {videoSubmitError}
                      </p>
                    ) : null}
                    <ul className={styles.list}>
                      {sortedFilteredVideos.map((video, videoRowIndex) => {
                        const currentStage =
                          videoStages[video.id] ?? video.stage;
                        return (
                          <li
                            key={video.id}
                            draggable
                            onDragStart={handleVideoRowDragStart(videoRowIndex)}
                            onDragEnd={handleVideoRowDragEnd}
                            onDragOver={handleVideoRowDragOver}
                            onDrop={handleVideoRowDrop(
                              sortedFilteredVideos,
                              videoRowIndex,
                            )}
                            data-search-id={toSearchTargetId("video", video.id)}
                            className={`${
                              highlightedItemId ===
                              toSearchTargetId("video", video.id)
                                ? styles.itemPulse
                                : ""
                            } ${
                              draggingVideoRowIndex === videoRowIndex
                                ? styles.videoRowDragging
                                : ""
                            }`}
                          >
                            <div className={styles.videoListRow}>
                              <img
                                className={styles.videoThumbMini}
                                src={getVideoThumbnailSrc(video)}
                                alt=""
                                draggable={false}
                                loading="lazy"
                              />
                              <div>
                                <strong>{video.title}</strong>
                                <span>
                                  {t("dashboard.labelPlatform")}:{" "}
                                  {highlightMatch(video.platform, search)} -{" "}
                                  {t("dashboard.labelDeadline")}:{" "}
                                  {highlightMatch(video.deadline, search)}
                                </span>
                                {currentStage === "published" &&
                                video.videoUrl ? (
                                  <div>
                                    <a
                                      href={video.videoUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      draggable={false}
                                    >
                                      {t("videos.openLink")}
                                    </a>
                                  </div>
                                ) : null}
                              </div>
                            </div>
                            <div className={styles.inlineControls}>
                              <label htmlFor={`modal-stage-${video.id}`}>
                                Étape :
                              </label>
                              <span
                                className={`${styles.stageBadge} ${styles[`stage_${currentStage}`]}`}
                              >
                                {stageLabelMap[currentStage]}
                              </span>
                              <select
                                id={`modal-stage-${video.id}`}
                                value={currentStage}
                                onChange={(event) =>
                                  setVideoStage(
                                    video.id,
                                    event.target.value as VideoStage,
                                  )
                                }
                              >
                                <option value="idea">{stageLabelMap.idea}</option>
                                <option value="scripting">
                                  {stageLabelMap.scripting}
                                </option>
                                <option value="recording">
                                  {stageLabelMap.recording}
                                </option>
                                <option value="editing">
                                  {stageLabelMap.editing}
                                </option>
                                <option value="published">
                                  {stageLabelMap.published}
                                </option>
                              </select>
                              <div className={styles.videoItemActions}>
                                <button
                                  type="button"
                                  className={styles.iconActionButton}
                                  data-tooltip={t("dashboard.editTooltip")}
                                  aria-label={t("dashboard.editVideoAria")}
                                  onClick={() => startVideoEdit(video)}
                                >
                                  <AiOutlineEdit aria-hidden="true" />
                                </button>
                                <button
                                  type="button"
                                  className={`${styles.iconActionButton} ${styles.deleteAction}`}
                                  data-tooltip={t("dashboard.deleteTooltip")}
                                  aria-label={t("dashboard.deleteVideoAriaShort")}
                                  onClick={() => deleteVideoItem(video.id)}
                                >
                                  <AiOutlineDelete aria-hidden="true" />
                                </button>
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </>
                ) : null}

                {focusedPanel === "todo" ? (
                  <>
                    <div className={styles.dropdownRow}>
                      <button
                        type="button"
                        className={styles.dropdownTrigger}
                        onClick={() => setIsTodoFormOpen((prev) => !prev)}
                      >
                        {isTodoFormOpen
                          ? t("dashboard.hideTaskForm")
                          : t("dashboard.addTask")}
                      </button>
                    </div>
                    {isTodoFormOpen ? (
                      <div className={styles.todoForm}>
                        <div className={styles.todoFormFields}>
                          <input
                            placeholder={t("dashboard.taskTitlePlaceholder")}
                            value={todoDraft.label}
                            onChange={(event) =>
                              setTodoDraftField("label", event.target.value)
                            }
                          />
                          <select
                            value={todoDraft.platform}
                            onChange={(event) =>
                              setTodoDraftField("platform", event.target.value)
                            }
                          >
                            <option value="">{t("dashboard.platformSelect")}</option>
                            {platforms.map((item) => (
                              <option
                                key={`modal-todo-platform-${item}`}
                                value={item}
                              >
                                {item}
                              </option>
                            ))}
                          </select>
                          <select
                            value={todoDraft.priority}
                            onChange={(event) =>
                              setTodoDraftField(
                                "priority",
                                event.target.value as "low" | "medium" | "high",
                              )
                            }
                          >
                            <option value="low">{priorityLabel.low}</option>
                            <option value="medium">{priorityLabel.medium}</option>
                            <option value="high">{priorityLabel.high}</option>
                          </select>
                          <select
                            value={todoDraft.column}
                            onChange={(event) =>
                              setTodoDraftField(
                                "column",
                                event.target.value as TodoColumn,
                              )
                            }
                          >
                            <option value="todo">{columnLabel.todo}</option>
                            <option value="doing">{columnLabel.doing}</option>
                            <option value="done">{columnLabel.done}</option>
                          </select>
                        </div>
                        <div className={styles.todoFormActions}>
                          <button type="button" onClick={submitTodoDraft}>
                            {editingTodoId
                              ? t("dashboard.editTask")
                              : t("dashboard.addTask")}
                          </button>
                          {editingTodoId ? (
                            <button
                              type="button"
                              onClick={() => {
                                resetTodoDraft();
                                setIsTodoFormOpen(false);
                              }}
                            >
                              {t("dashboard.cancel")}
                            </button>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                    <div className={styles.kanban}>
                      {(["todo", "doing", "done"] as const).map((column) => (
                        <div
                          key={column}
                          className={`${styles.kanbanColumn} ${
                            dragOverColumn === column ||
                            touchOverColumn === column
                              ? styles.kanbanColumnDropTarget
                              : ""
                          }`}
                          data-kanban-column={column}
                          onDragOver={(event) =>
                            handleColumnDragOver(event, column)
                          }
                          onDragLeave={() => setDragOverColumn(null)}
                          onDrop={() => handleColumnDrop(column)}
                        >
                          <p className={styles.columnTitle}>
                            {columnLabel[column]}
                          </p>
                          {filteredBoard
                            .filter((task) => task.column === column)
                            .map((task) => (
                              <div
                                key={task.id}
                                data-search-id={toSearchTargetId(
                                  "todo",
                                  task.id,
                                )}
                                className={`${styles.taskCard} ${
                                  draggingTaskId === task.id
                                    ? styles.taskCardDragging
                                    : ""
                                } ${
                                  highlightedItemId ===
                                  toSearchTargetId("todo", task.id)
                                    ? styles.itemPulse
                                    : ""
                                }`}
                                draggable
                                onDragStart={() => handleTaskDragStart(task.id)}
                                onDragEnd={handleTaskDragEnd}
                                onTouchStart={() =>
                                  handleTaskTouchStart(task.id)
                                }
                                onTouchMove={handleTaskTouchMove}
                                onTouchEnd={handleTaskTouchEnd}
                                onTouchCancel={handleTaskTouchEnd}
                              >
                                <input
                                  className={styles.taskTitleInput}
                                  value={task.label}
                                  onChange={(event) =>
                                    setTaskLabel(task.id, event.target.value)
                                  }
                                />
                                <div className={styles.taskItemActions}>
                                  <button
                                    type="button"
                                    className={styles.iconActionButton}
                                    data-tooltip={t("dashboard.editTooltip")}
                                    aria-label={t("dashboard.editTaskAria")}
                                    onClick={() => startTodoEdit(task)}
                                  >
                                    <AiOutlineEdit aria-hidden="true" />
                                  </button>
                                  <button
                                    type="button"
                                    className={`${styles.iconActionButton} ${styles.deleteAction}`}
                                    data-tooltip={t("dashboard.deleteTooltip")}
                                    aria-label={t("dashboard.deleteTaskAriaShort")}
                                    onClick={() => deleteTodoItem(task.id)}
                                  >
                                    <AiOutlineDelete aria-hidden="true" />
                                  </button>
                                </div>
                                <small>
                                  {highlightMatch(task.platform, search)} -{" "}
                                  {highlightMatch(
                                    priorityLabel[
                                      task.priority as keyof typeof priorityLabel
                                    ] ?? task.priority,
                                    search,
                                  )}
                                </small>
                                <small className={styles.dragHint}>
                                  {t("dashboard.dragCardHint")}
                                </small>
                              </div>
                            ))}
                        </div>
                      ))}
                    </div>
                  </>
                ) : null}
                {focusedPanel === "chart" ? (
                  <div
                    className={`${styles.chartWrap} ${styles.chartWrapModal}`}
                  >
                    <ResponsiveContainer width="100%" height={440}>
                      <ComposedChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#dbe2ee" />
                        <XAxis
                          dataKey="label"
                          tick={{ fontSize: 11, fill: "#475569" }}
                        />
                        <YAxis
                          yAxisId="left"
                          tick={{ fontSize: 11, fill: "#475569" }}
                        />
                        <YAxis
                          yAxisId="right"
                          orientation="right"
                          tick={{ fontSize: 11, fill: "#475569" }}
                        />
                        <Tooltip
                          content={
                            chartTooltipContent as ComponentProps<
                              typeof Tooltip
                            >["content"]
                          }
                        />
                        <Line
                          yAxisId="left"
                          type="monotone"
                          dataKey="publications"
                          name={t("dashboard.chartSeriesPublications")}
                          stroke="#2563eb"
                          strokeWidth={2}
                          dot={false}
                        />
                        <Bar
                          yAxisId="left"
                          dataKey="publies"
                          name={t("dashboard.chartSeriesAgendaSlots")}
                          fill="#14b8a6"
                          radius={[4, 4, 0, 0]}
                        />
                        <Bar
                          yAxisId="right"
                          dataKey="videosDue"
                          name={t("dashboard.chartSeriesVideosDue")}
                          fill="#e8a0d0"
                          radius={[4, 4, 0, 0]}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </BodyPortal>
      ) : null}
      {planningToDelete ? (
        <BodyPortal>
          <div
            className={styles.confirmOverlay}
            onClick={cancelPlanningDelete}
            role="presentation"
          >
            <div
              className={styles.confirmCard}
              onClick={(event) => event.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label={t("dashboard.confirmDeleteEvent")}
            >
              <p className={styles.confirmText}>
                {t("dashboard.confirmDelete")}
              </p>
              <p className={styles.confirmSubtext}>{planningToDelete.title}</p>
              <div className={styles.confirmActions}>
                <button type="button" onClick={cancelPlanningDelete}>
                  {t("dashboard.cancel")}
                </button>
                <button type="button" onClick={confirmPlanningDelete}>
                  {t("dashboard.delete")}
                </button>
              </div>
            </div>
          </div>
        </BodyPortal>
      ) : null}
      {platformToDelete ? (
        <BodyPortal>
          <div
            className={styles.confirmOverlay}
            onClick={cancelPlatformDelete}
            role="presentation"
          >
            <div
              className={styles.confirmCard}
              onClick={(event) => event.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label={t("dashboard.confirmDeletePlatform")}
            >
              <p className={styles.confirmText}>
                {t("dashboard.confirmDelete")}
              </p>
              <p className={styles.confirmSubtext}>{platformToDelete}</p>
              <div className={styles.confirmActions}>
                <button type="button" onClick={cancelPlatformDelete}>
                  {t("dashboard.cancel")}
                </button>
                <button type="button" onClick={confirmPlatformDelete}>
                  {t("dashboard.delete")}
                </button>
              </div>
            </div>
          </div>
        </BodyPortal>
      ) : null}
    </CreatorAppShell>
  );
}
