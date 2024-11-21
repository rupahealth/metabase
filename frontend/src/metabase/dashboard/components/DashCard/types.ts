import type { Card, DashboardCard } from "metabase-types/api";

export type CardSlownessStatus = "usually-fast" | "usually-slow" | boolean;

export type NavigateToNewCardFromDashboardOpts = {
  nextCard: Card;
  previousCard: Card;
  dashcard: DashboardCard;
  objectId?: number | string;
};

export type DashCardOnChangeCardAndRunHandler = (
  opts: Omit<NavigateToNewCardFromDashboardOpts, "dashcard">,
) => void;

export enum VisualizationType {
  TABLE = "table",
  BAR = "bar",
  LINE = "line",
  PIE = "pie",
  SCATTER = "scatter",
  AREA = "area",
  GAUGE = "gauge",
  KPI = "kpi",
  FUNNEL = "funnel",
  MAP = "map",
  PIVOT = "pivot",
  HISTOGRAM = "histogram",
  TIMELINE = "timeline",
  TEXT = "text",
  HEATMAP = "heatmap",
  TREEMAP = "treemap",
}
