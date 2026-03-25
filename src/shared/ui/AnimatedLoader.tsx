import styles from "./AnimatedLoader.module.scss";

export function AnimatedLoader() {
  return (
    <div
      className={styles.loader}
      role="status"
      aria-live="polite"
      aria-label="Chargement"
    >
      <div className={styles.visual} aria-hidden="true">
        <span className={styles.ring} />
        <span className={styles.dot} />
      </div>
    </div>
  );
}
