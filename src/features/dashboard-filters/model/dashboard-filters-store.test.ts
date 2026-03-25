import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import {
  useDashboardPeriod,
  useDashboardPlatform,
  useHasActiveDashboardFilters,
  useSetDashboardPeriod,
  useSetDashboardPlatform,
} from "./dashboard-filters-store";

describe("dashboard-filters-store", () => {
  beforeEach(() => {
    localStorage.removeItem("dashboard-filters");
    const { result } = renderHook(() => ({
      setPeriod: useSetDashboardPeriod(),
      setPlatform: useSetDashboardPlatform(),
    }));
    act(() => {
      result.current.setPeriod("30d");
      result.current.setPlatform("all");
    });
  });

  it("valeurs par défaut : 30d et toutes plateformes", () => {
    const { result } = renderHook(() => ({
      period: useDashboardPeriod(),
      platform: useDashboardPlatform(),
      hasActive: useHasActiveDashboardFilters(),
    }));
    expect(result.current.period).toBe("30d");
    expect(result.current.platform).toBe("all");
    expect(result.current.hasActive).toBe(false);
  });

  it("filtres actifs si période ou plateforme changent", () => {
    const { result } = renderHook(() => ({
      setPeriod: useSetDashboardPeriod(),
      setPlatform: useSetDashboardPlatform(),
      period: useDashboardPeriod(),
      platform: useDashboardPlatform(),
      hasActive: useHasActiveDashboardFilters(),
    }));
    act(() => {
      result.current.setPeriod("7d");
    });
    expect(result.current.hasActive).toBe(true);

    act(() => {
      result.current.setPeriod("30d");
      result.current.setPlatform("youtube");
    });
    expect(result.current.hasActive).toBe(true);
  });
});
