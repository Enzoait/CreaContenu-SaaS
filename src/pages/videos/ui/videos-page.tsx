import { useMemo, useState, type DragEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { addPlanningItem } from "../../../entities/dashboard/api/planning-api";
import { planningStatusFromVideoStage } from "../../../entities/dashboard/api/video-planning-sync";
import {
  addVideoItem,
  deleteVideoItem,
  reorderVideoItems,
  updateVideoItem,
} from "../../../entities/dashboard/api/videos-api";
import { toDateKey } from "../../../shared/lib/date-key";
import { moveInArray } from "../../../shared/lib/reorder-list";
import { useDashboardData } from "../../../entities/dashboard/model/use-dashboard-data";
import { selectAuthUser, useAuthStore } from "../../../shared/model/auth-store";
import { AnimatedLoader } from "../../../shared/ui/AnimatedLoader";
import { useI18n } from "../../../shared/i18n/use-i18n";
import { CreatorAppShell } from "../../../widgets/creator-app-shell";
import styles from "./videos-page.module.scss";

type VideoStage = "idea" | "scripting" | "recording" | "editing" | "published";

type DisplayVideo = {
  id: string;
  title: string;
  platform: string;
  stage: VideoStage;
  deadline: string;
  coverImageUrl?: string;
  videoUrl?: string;
  sortOrder?: number;
};

function compareVideoOrder(a: DisplayVideo, b: DisplayVideo): number {
  const ao = a.sortOrder ?? 0;
  const bo = b.sortOrder ?? 0;
  if (ao !== bo) return ao - bo;
  return a.deadline.localeCompare(b.deadline);
}

function getPlatformBaseUrl(platform: string): string {
  const key = platform.trim().toLowerCase();
  if (key === "youtube") return "https://www.youtube.com/results?search_query=";
  if (key === "instagram") return "https://www.instagram.com/explore/tags/";
  if (key === "tiktok") return "https://www.tiktok.com/search?q=";
  return "https://www.google.com/search?q=";
}

function getDefaultVideoUrl(video: DisplayVideo): string {
  const query = encodeURIComponent(video.title);
  const platformBase = getPlatformBaseUrl(video.platform);
  return `${platformBase}${query}`;
}

function getDefaultThumbnailUrl(video: DisplayVideo): string {
  return `https://placehold.co/800x450/e2e8f0/0f172a?text=${encodeURIComponent(video.title)}`;
}

function formatDate(value: string, locale: string): string {
  const date = new Date(
    /\d{4}-\d{2}-\d{2}/.test(value) ? `${value}T00:00:00` : value,
  );
  return date.toLocaleDateString(locale, {
    weekday: "short",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function VideosPage() {
  const { t, localeTag } = useI18n();
  const user = useAuthStore(selectAuthUser);
  const queryClient = useQueryClient();
  const { data, isLoading, isFetching, isError } = useDashboardData();

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
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingVideoId, setEditingVideoId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [draggingVideoRowIndex, setDraggingVideoRowIndex] = useState<
    number | null
  >(null);
  const [videoDraft, setVideoDraft] = useState<{
    title: string;
    platform: string;
    deadline: string;
    stage: VideoStage;
    coverImageUrl: string;
    videoUrl: string;
  }>({
    title: "",
    platform: "",
    deadline: "",
    stage: "idea",
    coverImageUrl: "",
    videoUrl: "",
  });

  const videos = useMemo<DisplayVideo[]>(() => {
    if (!data) return [];
    return [...data.videos]
      .sort(compareVideoOrder)
      .map((video) => {
        const enrichedVideo = video as DisplayVideo;
        return {
          ...video,
          sortOrder: enrichedVideo.sortOrder,
          coverImageUrl: enrichedVideo.coverImageUrl,
          videoUrl: enrichedVideo.videoUrl,
        };
      });
  }, [data]);

  const stageCounts = useMemo(() => {
    return videos.reduce<Record<VideoStage, number>>(
      (acc, item) => {
        acc[item.stage] += 1;
        return acc;
      },
      { idea: 0, scripting: 0, recording: 0, editing: 0, published: 0 },
    );
  }, [videos]);

  const platforms = useMemo(() => {
    if (!data) return [];
    const fromData = data.platforms ?? [];
    const fromVideos = data.videos.map((item) => item.platform);
    return Array.from(new Set([...fromData, ...fromVideos])).filter(Boolean);
  }, [data]);

  const calendarItems = useMemo(() => {
    return videos.map((video) => {
      const sameDayPlanning =
        data?.planning.filter((item) => item.publishAt === video.deadline) ??
        [];
      return {
        id: video.id,
        deadline: video.deadline,
        title: video.title,
        planningCount: sameDayPlanning.length,
      };
    });
  }, [videos, data?.planning]);

  const handleVideoDragStart =
    (index: number) => (event: DragEvent<HTMLElement>) => {
      event.dataTransfer.setData("text/plain", String(index));
      event.dataTransfer.effectAllowed = "move";
      setDraggingVideoRowIndex(index);
    };

  const handleVideoDragEnd = () => {
    setDraggingVideoRowIndex(null);
  };

  const handleVideoDragOver = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  };

  const handleVideoDrop =
    (dropIndex: number) => (event: DragEvent<HTMLElement>) => {
      event.preventDefault();
      const from = Number(event.dataTransfer.getData("text/plain"));
      setDraggingVideoRowIndex(null);
      if (!user?.id || Number.isNaN(from) || from === dropIndex) return;
      const ids = videos.map((v) => v.id);
      const newFull = moveInArray(ids, from, dropIndex);
      void (async () => {
        try {
          await reorderVideoItems(user.id, newFull);
          await queryClient.invalidateQueries({
            queryKey: ["dashboard", "overview", user.id],
          });
        } catch (err) {
          setErrorMessage(
            err instanceof Error ? err.message : t("videos.reorderError"),
          );
        }
      })();
    };

  const shouldShowLoader = isLoading || (!data && isFetching);
  if (shouldShowLoader) return <AnimatedLoader />;

  if (isError || !data) {
    return (
      <div className={styles.empty}>
        Une erreur est survenue pendant le chargement des videos.
      </div>
    );
  }

  const resetDraft = () => {
    setVideoDraft({
      title: "",
      platform: platforms[0] ?? "",
      deadline: "",
      stage: "idea",
      coverImageUrl: "",
      videoUrl: "",
    });
    setEditingVideoId(null);
  };

  const refreshVideos = async () => {
    if (!user?.id) return;
    await queryClient.invalidateQueries({
      queryKey: ["dashboard", "overview", user.id],
    });
  };

  const submitVideo = async () => {
    if (!user?.id) {
      setErrorMessage(t("videos.errorUser"));
      return;
    }

    if (
      !videoDraft.title.trim() ||
      !videoDraft.platform.trim() ||
      !videoDraft.deadline
    ) {
      setErrorMessage(t("videos.errorRequired"));
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const coverImageUrl = videoDraft.coverImageUrl.trim();
      const videoUrl =
        videoDraft.stage === "published" ? videoDraft.videoUrl.trim() : "";

      if (editingVideoId) {
        await updateVideoItem(editingVideoId, {
          title: videoDraft.title.trim(),
          platform: videoDraft.platform.trim(),
          deadline: toDateKey(videoDraft.deadline),
          stage: videoDraft.stage,
          coverImageUrl,
          videoUrl,
        });
      } else {
        const deadlineKey = toDateKey(videoDraft.deadline);
        const newVideo = await addVideoItem(user.id, {
          title: videoDraft.title.trim(),
          platform: videoDraft.platform.trim(),
          deadline: deadlineKey,
          stage: videoDraft.stage,
          ...(coverImageUrl ? { coverImageUrl } : {}),
          ...(videoUrl ? { videoUrl } : {}),
        });
        await addPlanningItem(user.id, {
          title: newVideo.title,
          platform: newVideo.platform,
          publishAt: deadlineKey,
          status: planningStatusFromVideoStage(videoDraft.stage),
          videoId: newVideo.id,
        });
      }

      await refreshVideos();
      resetDraft();
      setIsFormOpen(false);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible d'enregistrer la video.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEdit = (video: DisplayVideo) => {
    setEditingVideoId(video.id);
    setVideoDraft({
      title: video.title,
      platform: video.platform,
      deadline: video.deadline,
      stage: video.stage,
      coverImageUrl: video.coverImageUrl ?? "",
      videoUrl: video.videoUrl ?? "",
    });
    setIsFormOpen(true);
  };

  const removeVideo = async (id: string) => {
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      await deleteVideoItem(id);
      await refreshVideos();
      if (editingVideoId === id) {
        resetDraft();
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : t("videos.errorDelete"),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const setVideoStage = async (id: string, stage: VideoStage) => {
    setErrorMessage(null);
    try {
      await updateVideoItem(id, { stage });
      await refreshVideos();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : t("videos.errorStage"),
      );
    }
  };

  return (
    <CreatorAppShell>
      <section className={styles.page}>
        <header className={styles.hero}>
          <div>
            <h1>{t("shell.videos")}</h1>
            <p>{t("videos.heroSubtitle")}</p>
          </div>
          <Link className={styles.backLink} to="/dashboard">
            {t("videos.backDashboard")}
          </Link>
        </header>

        <section className={styles.metrics}>
          <article className={styles.metricCard}>
            <span>{t("videos.metricTotal")}</span>
            <strong>{videos.length}</strong>
          </article>
          <article className={styles.metricCard}>
            <span>{t("videos.metricProduction")}</span>
            <strong>
              {stageCounts.idea +
                stageCounts.scripting +
                stageCounts.recording +
                stageCounts.editing}
            </strong>
          </article>
          <article className={styles.metricCard}>
            <span>{t("videos.metricPublished")}</span>
            <strong>{stageCounts.published}</strong>
          </article>
        </section>

        <section className={styles.formCard}>
          <div className={styles.formHeader}>
            <h2>{t("videos.managementTitle")}</h2>
            <button
              type="button"
              className={styles.toggleFormButton}
              onClick={() => {
                if (!isFormOpen) {
                  resetDraft();
                }
                setIsFormOpen((prev) => !prev);
              }}
            >
              {isFormOpen ? t("videos.hideForm") : t("videos.addVideo")}
            </button>
          </div>

          {isFormOpen ? (
            <div className={styles.formGrid}>
              <input
                placeholder={t("videos.placeholderTitle")}
                value={videoDraft.title}
                onChange={(event) =>
                  setVideoDraft((prev) => ({
                    ...prev,
                    title: event.target.value,
                  }))
                }
              />
              <input
                type="date"
                value={videoDraft.deadline}
                onChange={(event) =>
                  setVideoDraft((prev) => ({
                    ...prev,
                    deadline: event.target.value,
                  }))
                }
              />
              <select
                value={videoDraft.platform}
                onChange={(event) =>
                  setVideoDraft((prev) => ({
                    ...prev,
                    platform: event.target.value,
                  }))
                }
              >
                <option value="">{t("videos.platformOption")}</option>
                {platforms.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
              <select
                value={videoDraft.stage}
                onChange={(event) =>
                  setVideoDraft((prev) => ({
                    ...prev,
                    stage: event.target.value as VideoStage,
                  }))
                }
              >
                <option value="idea">{stageLabelMap.idea}</option>
                <option value="scripting">{stageLabelMap.scripting}</option>
                <option value="recording">{stageLabelMap.recording}</option>
                <option value="editing">{stageLabelMap.editing}</option>
                <option value="published">{stageLabelMap.published}</option>
              </select>
              <input
                type="url"
                className={styles.formGridFieldFull}
                placeholder={t("videos.coverPlaceholder")}
                value={videoDraft.coverImageUrl}
                onChange={(event) =>
                  setVideoDraft((prev) => ({
                    ...prev,
                    coverImageUrl: event.target.value,
                  }))
                }
              />
              {videoDraft.stage === "published" ? (
                <input
                  type="url"
                  className={styles.formGridFieldFull}
                  placeholder="Lien de la video publiee"
                  value={videoDraft.videoUrl}
                  onChange={(event) =>
                    setVideoDraft((prev) => ({
                      ...prev,
                      videoUrl: event.target.value,
                    }))
                  }
                />
              ) : null}
              <div className={`${styles.formActions} ${styles.formGridFieldFull}`}>
                <button
                  type="button"
                  onClick={submitVideo}
                  disabled={isSubmitting}
                >
                  {editingVideoId ? t("videos.modify") : t("videos.add")}
                </button>
                {editingVideoId ? (
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={resetDraft}
                    disabled={isSubmitting}
                  >
                    {t("videos.cancel")}
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}

          {errorMessage ? (
            <p className={styles.errorMessage}>{errorMessage}</p>
          ) : null}
        </section>

        {videos.length === 0 ? (
          <div className={styles.empty}>Aucune video pour le moment.</div>
        ) : null}

        {videos.length > 0 ? (
          <section className={styles.videoBoard}>
            <header className={styles.videoBoardHeader}>
              <span>{t("videos.tableVideo")}</span>
              <span>{t("videos.tableInfo")}</span>
              <span>{t("videos.tableActions")}</span>
            </header>
            {videos.map((video, index) => {
              const videoUrl = video.videoUrl ?? getDefaultVideoUrl(video);
              const coverSrc =
                video.coverImageUrl?.trim() || getDefaultThumbnailUrl(video);

              return (
                <article
                  key={video.id}
                  draggable
                  onDragStart={handleVideoDragStart(index)}
                  onDragEnd={handleVideoDragEnd}
                  onDragOver={handleVideoDragOver}
                  onDrop={handleVideoDrop(index)}
                  className={`${styles.videoRow}${
                    draggingVideoRowIndex === index
                      ? ` ${styles.videoRowDragging}`
                      : ""
                  }`}
                >
                  <img
                    className={styles.thumb}
                    src={coverSrc}
                    alt={t("videos.thumbAlt", { title: video.title })}
                    loading="lazy"
                    draggable={false}
                  />
                  <div className={styles.videoMain}>
                    <h3 className={styles.videoTitle}>{video.title}</h3>
                    <div className={styles.metaRow}>
                      <span className={styles.metaChip}>{video.platform}</span>
                      <span className={styles.metaChip}>
                        {stageLabelMap[video.stage]}
                      </span>
                    </div>
                    <p className={styles.deadline}>
                      {t("videos.deadlineLabel")}:{" "}
                      {formatDate(video.deadline, localeTag)}
                    </p>
                    <a
                      className={styles.videoLink}
                      href={videoUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {t("videos.openLink")}
                    </a>
                    <small className={styles.planningHint}>
                      {t("videos.planningSameDay", {
                        n: String(
                          data.planning.filter(
                            (item) => item.publishAt === video.deadline,
                          ).length,
                        ),
                      })}
                    </small>
                  </div>
                  <div className={styles.videoControls}>
                    <div className={styles.stageRow}>
                      <label htmlFor={`video-stage-${video.id}`}>
                        {t("videos.stageLabel")}
                      </label>
                      <select
                        id={`video-stage-${video.id}`}
                        value={video.stage}
                        onChange={(event) =>
                          setVideoStage(
                            video.id,
                            event.target.value as VideoStage,
                          )
                        }
                      >
                        <option value="idea">Idee</option>
                        <option value="scripting">Script</option>
                        <option value="recording">Tournage</option>
                        <option value="editing">Montage</option>
                        <option value="published">Publiee</option>
                      </select>
                    </div>
                    <div className={styles.rowActions}>
                      <button
                        type="button"
                        className={styles.secondaryButton}
                        onClick={() => startEdit(video)}
                      >
                        Modifier
                      </button>
                      <button
                        type="button"
                        className={styles.dangerButton}
                        onClick={() => removeVideo(video.id)}
                        disabled={isSubmitting}
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        ) : null}

        {calendarItems.length > 0 ? (
          <section className={styles.calendar}>
            <h2>{t("videos.calendarTitle")}</h2>
            <ul className={styles.calendarList}>
              {calendarItems.map((item) => (
                <li key={item.id} className={styles.calendarItem}>
                  <span>{formatDate(item.deadline, localeTag)}</span>
                  <strong>{item.title}</strong>
                  <small>
                    {t("videos.calendarSlots", {
                      n: String(item.planningCount),
                    })}
                  </small>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </section>
    </CreatorAppShell>
  );
}
