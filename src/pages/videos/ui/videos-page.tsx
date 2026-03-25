import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  addVideoItem,
  deleteVideoItem,
  updateVideoItem,
} from "../../../entities/dashboard/api/videos-api";
import { useDashboardData } from "../../../entities/dashboard/model/use-dashboard-data";
import { selectAuthUser, useAuthStore } from "../../../shared/model/auth-store";
import { AnimatedLoader } from "../../../shared/ui/AnimatedLoader";
import { CreatorAppShell } from "../../../widgets/creator-app-shell";
import styles from "./videos-page.module.scss";

type VideoStage = "idea" | "scripting" | "recording" | "editing" | "published";

type DisplayVideo = {
  id: string;
  title: string;
  platform: string;
  stage: VideoStage;
  deadline: string;
  thumbnailUrl?: string;
  videoUrl?: string;
};

const STAGE_LABEL: Record<VideoStage, string> = {
  idea: "Idee",
  scripting: "Script",
  recording: "Tournage",
  editing: "Montage",
  published: "Publiee",
};

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

function formatDate(value: string): string {
  const date = new Date(
    /\d{4}-\d{2}-\d{2}/.test(value) ? `${value}T00:00:00` : value,
  );
  return date.toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function VideosPage() {
  const user = useAuthStore(selectAuthUser);
  const queryClient = useQueryClient();
  const { data, isLoading, isFetching, isError } = useDashboardData();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingVideoId, setEditingVideoId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [videoDraft, setVideoDraft] = useState<{
    title: string;
    platform: string;
    deadline: string;
    stage: VideoStage;
  }>({
    title: "",
    platform: "",
    deadline: "",
    stage: "idea",
  });

  const videos = useMemo<DisplayVideo[]>(() => {
    if (!data) return [];
    return [...data.videos]
      .sort((a, b) => a.deadline.localeCompare(b.deadline))
      .map((video) => {
        const enrichedVideo = video as DisplayVideo;
        return {
          ...video,
          thumbnailUrl: enrichedVideo.thumbnailUrl,
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
      setErrorMessage("Utilisateur non identifie.");
      return;
    }

    if (
      !videoDraft.title.trim() ||
      !videoDraft.platform.trim() ||
      !videoDraft.deadline
    ) {
      setErrorMessage("Titre, plateforme et deadline sont obligatoires.");
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      if (editingVideoId) {
        await updateVideoItem(editingVideoId, {
          title: videoDraft.title.trim(),
          platform: videoDraft.platform.trim(),
          deadline: videoDraft.deadline,
          stage: videoDraft.stage,
        });
      } else {
        await addVideoItem(user.id, {
          title: videoDraft.title.trim(),
          platform: videoDraft.platform.trim(),
          deadline: videoDraft.deadline,
          stage: videoDraft.stage,
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
        error instanceof Error ? error.message : "Suppression impossible.",
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
        error instanceof Error
          ? error.message
          : "Impossible de mettre a jour l'etape.",
      );
    }
  };

  return (
    <CreatorAppShell>
      <section className={styles.page}>
        <header className={styles.hero}>
          <div>
            <h1>Mes videos</h1>
            <p>
              Toutes vos videos avec miniature, liens, informations de
              production et calendrier.
            </p>
          </div>
          <Link className={styles.backLink} to="/dashboard">
            Retour au tableau de bord
          </Link>
        </header>

        <section className={styles.metrics}>
          <article className={styles.metricCard}>
            <span>Total videos</span>
            <strong>{videos.length}</strong>
          </article>
          <article className={styles.metricCard}>
            <span>En production</span>
            <strong>
              {stageCounts.idea +
                stageCounts.scripting +
                stageCounts.recording +
                stageCounts.editing}
            </strong>
          </article>
          <article className={styles.metricCard}>
            <span>Publiees</span>
            <strong>{stageCounts.published}</strong>
          </article>
        </section>

        <section className={styles.formCard}>
          <div className={styles.formHeader}>
            <h2>Gestion des videos</h2>
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
              {isFormOpen ? "Masquer" : "Ajouter une video"}
            </button>
          </div>

          {isFormOpen ? (
            <div className={styles.formGrid}>
              <input
                placeholder="Titre de la video"
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
                <option value="">Plateforme</option>
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
                <option value="idea">Idee</option>
                <option value="scripting">Script</option>
                <option value="recording">Tournage</option>
                <option value="editing">Montage</option>
                <option value="published">Publiee</option>
              </select>
              <div className={styles.formActions}>
                <button
                  type="button"
                  onClick={submitVideo}
                  disabled={isSubmitting}
                >
                  {editingVideoId ? "Modifier" : "Ajouter"}
                </button>
                {editingVideoId ? (
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={resetDraft}
                    disabled={isSubmitting}
                  >
                    Annuler
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
              <span>Video</span>
              <span>Infos</span>
              <span>Actions</span>
            </header>
            {videos.map((video) => {
              const videoUrl = video.videoUrl ?? getDefaultVideoUrl(video);
              const thumbnailUrl =
                video.thumbnailUrl ?? getDefaultThumbnailUrl(video);

              return (
                <article key={video.id} className={styles.videoRow}>
                  <img
                    className={styles.thumb}
                    src={thumbnailUrl}
                    alt={`Miniature de ${video.title}`}
                    loading="lazy"
                  />
                  <div className={styles.videoMain}>
                    <h3 className={styles.videoTitle}>{video.title}</h3>
                    <div className={styles.metaRow}>
                      <span className={styles.metaChip}>{video.platform}</span>
                      <span className={styles.metaChip}>
                        {STAGE_LABEL[video.stage]}
                      </span>
                    </div>
                    <p className={styles.deadline}>
                      Deadline: {formatDate(video.deadline)}
                    </p>
                    <a
                      className={styles.videoLink}
                      href={videoUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Ouvrir le lien
                    </a>
                    <small className={styles.planningHint}>
                      Calendrier:{" "}
                      {
                        data.planning.filter(
                          (item) => item.publishAt === video.deadline,
                        ).length
                      }{" "}
                      contenu(x) planifie(s) le meme jour
                    </small>
                  </div>
                  <div className={styles.videoControls}>
                    <div className={styles.stageRow}>
                      <label htmlFor={`video-stage-${video.id}`}>Etape</label>
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
            <h2>Calendrier videos</h2>
            <ul className={styles.calendarList}>
              {calendarItems.map((item) => (
                <li key={item.id} className={styles.calendarItem}>
                  <span>{formatDate(item.deadline)}</span>
                  <strong>{item.title}</strong>
                  <small>{item.planningCount} slot(s) planning</small>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </section>
    </CreatorAppShell>
  );
}
