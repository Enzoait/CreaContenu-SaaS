import { zodResolver } from "@hookform/resolvers/zod";
import { jsPDF } from "jspdf";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import {
  HiOutlineArrowDownTray,
  HiOutlineLockClosed,
  HiOutlineUser,
} from "react-icons/hi2";
import {
  useCurrentUserDataQuery,
  useCurrentUserQuery,
  useUpsertUserDataMutation,
} from "../../../entities/user";
import {
  createChangePasswordSchema,
  useChangePasswordMutation,
  type ChangePasswordFormValues,
} from "../../../features/auth";
import {
  createAccountProfileFormSchema,
  useAccountActiveTab,
  useSetAccountActiveTab,
  type AccountProfileFormValues,
  type AccountTab,
} from "../model";
import { useI18n, type MessageKey } from "../../../shared/i18n/use-i18n";
import { CreatorAppShell } from "../../../widgets/creator-app-shell";

const downloadBlob = (
  fileName: string,
  content: BlobPart,
  mimeType: string,
) => {
  const blob = new Blob([content], { type: mimeType });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
};

export const AccountPage = () => {
  const { t, localeTag } = useI18n();
  const activeTab = useAccountActiveTab();
  const setActiveTab = useSetAccountActiveTab();

  const accountTabs = useMemo<Array<{ id: AccountTab; labelKey: MessageKey }>>(
    () => [
      { id: "profil", labelKey: "account.tabProfile" },
      { id: "securite", labelKey: "account.tabSecurity" },
      { id: "export", labelKey: "account.tabExport" },
    ],
    [],
  );
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);
  const {
    data: userData,
    isPending: isUserDataPending,
    isError: isUserDataError,
    error: userDataError,
  } = useCurrentUserDataQuery();
  const { data: currentUser } = useCurrentUserQuery();
  const { mutateAsync: upsertUserData, isPending: isSavingProfile } =
    useUpsertUserDataMutation();
  const { mutateAsync: changePassword, isPending: isChangingPassword } =
    useChangePasswordMutation();
  const [passwordSavedAt, setPasswordSavedAt] = useState<string | null>(null);
  const [passwordErrorMessage, setPasswordErrorMessage] = useState<
    string | null
  >(null);

  const displayFirstname =
    userData?.firstname || t("account.defaultFirstname");
  const displayLastname = userData?.lastname || t("account.defaultLastname");
  const displayFullName = `${displayFirstname} ${displayLastname}`;
  const displayEmail =
    userData?.email || currentUser?.email || t("account.emailUnavailable");
  const displayPhone =
    userData?.phoneNumber || t("account.phoneUnavailable");
  const displayCountry =
    userData?.country || t("account.countryUnavailable");
  const displayRegion =
    userData?.region || t("account.regionUnavailable");
  const displayProfilePicture = userData?.profilePicture?.trim() || "";

  const profileFormSchema = useMemo(
    () => createAccountProfileFormSchema(t),
    [t],
  );
  const passwordFormSchema = useMemo(
    () => createChangePasswordSchema(t),
    [t],
  );

  const {
    register,
    handleSubmit: handleProfileSubmit,
    reset: resetProfileForm,
    formState: { errors },
  } = useForm<AccountProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      firstname: userData?.firstname ?? "",
      lastname: userData?.lastname ?? "",
      email: userData?.email ?? currentUser?.email ?? "",
      phoneNumber: userData?.phoneNumber ?? "",
      country: userData?.country ?? "",
      region: userData?.region ?? "",
      profilePicture: userData?.profilePicture ?? "",
    },
  });

  useEffect(() => {
    resetProfileForm({
      firstname: userData?.firstname ?? "",
      lastname: userData?.lastname ?? "",
      email: userData?.email ?? currentUser?.email ?? "",
      phoneNumber: userData?.phoneNumber ?? "",
      country: userData?.country ?? "",
      region: userData?.region ?? "",
      profilePicture: userData?.profilePicture ?? "",
    });
  }, [
    currentUser?.email,
    resetProfileForm,
    userData?.country,
    userData?.email,
    userData?.firstname,
    userData?.lastname,
    userData?.phoneNumber,
    userData?.profilePicture,
    userData?.region,
  ]);

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    reset: resetPasswordForm,
    formState: { errors: passwordErrors },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (values: AccountProfileFormValues) => {
    if (!currentUser?.id) {
      setSaveErrorMessage(t("account.userNotIdentified"));
      return;
    }

    setSaveErrorMessage(null);

    try {
      await upsertUserData({
        userId: currentUser.id,
        firstname: values.firstname.trim(),
        lastname: values.lastname.trim(),
        email: values.email.trim(),
        phoneNumber: values.phoneNumber.trim(),
        country: values.country.trim(),
        region: values.region.trim(),
        profilePicture: values.profilePicture?.trim() ?? "",
      });
      setSavedAt(
        new Date().toLocaleTimeString(localeTag, {
          hour: "2-digit",
          minute: "2-digit",
        }),
      );
    } catch (error) {
      setSaveErrorMessage(
        error instanceof Error ? error.message : t("account.saveProfileError"),
      );
    }
  };

  const handleTextExport = () => {
    const payload = [
      t("account.exportTitle"),
      `${t("account.exportDate")}: ${new Date().toLocaleString(localeTag)}`,
      "",
      `${t("account.exportFieldFirstname")}: ${displayFirstname}`,
      `${t("account.exportFieldLastname")}: ${displayLastname}`,
      `${t("account.exportFieldEmail")}: ${displayEmail}`,
      `${t("account.exportFieldPhone")}: ${displayPhone}`,
      `${t("account.exportFieldCountry")}: ${displayCountry}`,
      `${t("account.exportFieldRegion")}: ${displayRegion}`,
      `${t("account.exportUserId")}: ${currentUser?.id ?? t("account.notAvailable")}`,
    ].join("\n");

    downloadBlob(
      "donnees-personnelles.txt",
      payload,
      "text/plain;charset=utf-8",
    );
  };

  const handlePdfExport = () => {
    const document = new jsPDF();
    document.setFontSize(16);
    document.text(t("account.exportTitle"), 20, 20);

    document.setFontSize(11);
    const lines = [
      `${t("account.exportDate")}: ${new Date().toLocaleString(localeTag)}`,
      "",
      `${t("account.exportFieldFirstname")}: ${displayFirstname}`,
      `${t("account.exportFieldLastname")}: ${displayLastname}`,
      `${t("account.exportFieldEmail")}: ${displayEmail}`,
      `${t("account.exportFieldPhone")}: ${displayPhone}`,
      `${t("account.exportFieldCountry")}: ${displayCountry}`,
      `${t("account.exportFieldRegion")}: ${displayRegion}`,
      `${t("account.exportUserId")}: ${currentUser?.id ?? t("account.notAvailable")}`,
    ];

    document.text(lines, 20, 32);
    document.save("donnees-personnelles.pdf");
  };

  const onChangePassword = async (values: ChangePasswordFormValues) => {
    setPasswordErrorMessage(null);

    try {
      await changePassword(values);
      resetPasswordForm();
      setPasswordSavedAt(
        new Date().toLocaleTimeString(localeTag, {
          hour: "2-digit",
          minute: "2-digit",
        }),
      );
    } catch (error) {
      setPasswordErrorMessage(
        error instanceof Error
          ? error.message
          : t("account.passwordChangeError"),
      );
    }
  };

  const renderProfilePanel = () => {
    if (isUserDataPending) {
      return <p>{t("account.loadingProfile")}</p>;
    }

    if (isUserDataError) {
      return (
        <p className="error">
          {t("account.loadErrorPrefix")} {userDataError.message}
        </p>
      );
    }

    return (
      <div className="account-v2-grid">
        <section className="account-v2-hero">
          <div className="account-v2-hero-main">
            <img
              className="account-v2-photo"
              src={
                displayProfilePicture ||
                `https://api.dicebear.com/9.x/lorelei/svg?seed=${encodeURIComponent(displayFullName)}&radius=50`
              }
              alt={t("account.profilePhotoAlt")}
            />
            <div>
              <h2 className="account-v2-name">{displayFullName}</h2>
              <p className="account-v2-subtitle">{t("account.roleCreator")}</p>
              <p className="account-v2-meta">
                {displayRegion}, {displayCountry} · {displayEmail}
              </p>
            </div>
          </div>
          <div className="account-v2-kpis">
            <article>
              <span>{t("account.kpiId")}</span>
              <strong>{currentUser?.id?.slice(0, 8) ?? "-"}</strong>
            </article>
            <article>
              <span>{t("account.labelPhone")}</span>
              <strong>{displayPhone}</strong>
            </article>
            <article>
              <span>{t("account.kpiLastUpdated")}</span>
              <strong>{savedAt ? `${savedAt}` : t("account.neverSaved")}</strong>
            </article>
          </div>
        </section>

        <section className="account-v2-card">
          <div className="account-v2-card-header">
            <h3 className="account-section-title">
              {t("account.editInfoTitle")}
            </h3>
            <span className="account-v2-badge">{t("account.badgePublic")}</span>
          </div>
          <form
            className="account-v2-form"
            onSubmit={handleProfileSubmit(onSubmit)}
          >
            <div className="account-v2-form-grid">
              <label className="field-label" htmlFor="account-firstname">
                {t("account.labelFirstname")}
              </label>
              <input
                id="account-firstname"
                className="field-input"
                type="text"
                autoComplete="given-name"
                {...register("firstname")}
              />
              {errors.firstname ? (
                <p className="error">{errors.firstname.message}</p>
              ) : null}

              <label className="field-label" htmlFor="account-lastname">
                {t("account.labelLastname")}
              </label>
              <input
                id="account-lastname"
                className="field-input"
                type="text"
                autoComplete="family-name"
                {...register("lastname")}
              />
              {errors.lastname ? (
                <p className="error">{errors.lastname.message}</p>
              ) : null}

              <label className="field-label" htmlFor="account-email">
                {t("account.labelEmail")}
              </label>
              <input
                id="account-email"
                className="field-input"
                type="email"
                autoComplete="email"
                {...register("email")}
              />
              {errors.email ? (
                <p className="error">{errors.email.message}</p>
              ) : null}

              <label className="field-label" htmlFor="account-phone">
                {t("account.labelPhone")}
              </label>
              <input
                id="account-phone"
                className="field-input"
                type="tel"
                autoComplete="tel"
                {...register("phoneNumber")}
              />
              {errors.phoneNumber ? (
                <p className="error">{errors.phoneNumber.message}</p>
              ) : null}

              <label className="field-label" htmlFor="account-country">
                {t("account.labelCountry")}
              </label>
              <input
                id="account-country"
                className="field-input"
                type="text"
                autoComplete="country-name"
                {...register("country")}
              />
              {errors.country ? (
                <p className="error">{errors.country.message}</p>
              ) : null}

              <label className="field-label" htmlFor="account-region">
                {t("account.labelRegion")}
              </label>
              <input
                id="account-region"
                className="field-input"
                type="text"
                autoComplete="address-level2"
                {...register("region")}
              />
              {errors.region ? (
                <p className="error">{errors.region.message}</p>
              ) : null}

              <label className="field-label" htmlFor="account-profile-picture">
                {t("account.labelProfilePicture")}
              </label>
              <input
                id="account-profile-picture"
                className="field-input"
                type="url"
                placeholder={t("account.placeholderProfilePicture")}
                {...register("profilePicture")}
              />
              {errors.profilePicture ? (
                <p className="error">{errors.profilePicture.message}</p>
              ) : null}
            </div>

            {saveErrorMessage ? (
              <p className="error">{saveErrorMessage}</p>
            ) : null}

            <div className="account-v2-form-actions">
              <button
                type="submit"
                className="auth-primary"
                disabled={isSavingProfile}
              >
                {isSavingProfile ? t("account.saving") : t("account.save")}
              </button>
              {savedAt ? (
                <span className="muted">
                  {t("account.savedAt", { time: savedAt })}
                </span>
              ) : null}
            </div>
          </form>
        </section>
      </div>
    );
  };

  const renderSecurityPanel = () => (
    <section className="account-v2-card">
      <div className="account-v2-card-header">
        <h3 className="account-section-title">{t("account.tabSecurity")}</h3>
        <span className="account-v2-badge">{t("account.badgePassword")}</span>
      </div>
      <form
        className="account-v2-form"
        onSubmit={handlePasswordSubmit(onChangePassword)}
      >
        <div className="account-v2-form-grid">
          <label className="field-label" htmlFor="account-current-password">
            {t("account.passwordCurrent")}
          </label>
          <input
            id="account-current-password"
            className="field-input"
            type="password"
            autoComplete="current-password"
            {...registerPassword("currentPassword")}
          />
          {passwordErrors.currentPassword ? (
            <p className="error">{passwordErrors.currentPassword.message}</p>
          ) : null}

          <label className="field-label" htmlFor="account-new-password">
            {t("account.passwordNew")}
          </label>
          <input
            id="account-new-password"
            className="field-input"
            type="password"
            autoComplete="new-password"
            {...registerPassword("newPassword")}
          />
          {passwordErrors.newPassword ? (
            <p className="error">{passwordErrors.newPassword.message}</p>
          ) : null}

          <label className="field-label" htmlFor="account-confirm-password">
            {t("account.passwordConfirm")}
          </label>
          <input
            id="account-confirm-password"
            className="field-input"
            type="password"
            autoComplete="new-password"
            {...registerPassword("confirmPassword")}
          />
          {passwordErrors.confirmPassword ? (
            <p className="error">{passwordErrors.confirmPassword.message}</p>
          ) : null}
        </div>

        {passwordErrorMessage ? (
          <p className="error">{passwordErrorMessage}</p>
        ) : null}

        <div className="account-v2-form-actions">
          <button
            type="submit"
            className="auth-primary"
            disabled={isChangingPassword}
          >
            {isChangingPassword
              ? t("account.passwordSubmitting")
              : t("account.passwordSubmit")}
          </button>
          {passwordSavedAt ? (
            <span className="muted">
              {t("account.passwordSavedAt", { time: passwordSavedAt })}
            </span>
          ) : null}
        </div>
      </form>
    </section>
  );

  const renderExportPanel = () => (
    <section className="account-v2-card">
      <div className="account-v2-card-header">
        <h3 className="account-section-title">{t("account.exportPanelTitle")}</h3>
        <span className="account-v2-badge">{t("account.badgeGdpr")}</span>
      </div>
      <p className="muted account-v2-export-text">
        {t("account.exportDescription")}
      </p>
      <div className="account-v2-export-actions">
        <button
          type="button"
          className="auth-primary account-v2-export-btn"
          onClick={handleTextExport}
        >
          <HiOutlineArrowDownTray aria-hidden="true" />
          {t("account.exportTxt")}
        </button>
        <button
          type="button"
          className="auth-primary account-v2-export-btn"
          onClick={handlePdfExport}
        >
          <HiOutlineArrowDownTray aria-hidden="true" />
          {t("account.exportPdf")}
        </button>
      </div>
    </section>
  );

  return (
    <CreatorAppShell accountTopBar>
      <div className="account-v2-layout">
        <aside className="account-v2-sidebar">
          <h1 className="account-v2-title">{t("shell.account")}</h1>
          <p className="account-v2-description">
            {t("account.sidebarDescription")}
          </p>
          {accountTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`account-v2-tab ${activeTab === tab.id ? "is-active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.id === "profil" ? (
                <HiOutlineUser aria-hidden="true" />
              ) : null}
              {tab.id === "securite" ? (
                <HiOutlineLockClosed aria-hidden="true" />
              ) : null}
              {tab.id === "export" ? (
                <HiOutlineArrowDownTray aria-hidden="true" />
              ) : null}
              {t(tab.labelKey)}
            </button>
          ))}
        </aside>

        <section className="account-v2-main">
          {activeTab === "profil" ? renderProfilePanel() : null}
          {activeTab === "securite" ? renderSecurityPanel() : null}
          {activeTab === "export" ? renderExportPanel() : null}
        </section>
      </div>
    </CreatorAppShell>
  );
};
