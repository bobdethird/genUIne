"use client";

import { useState, Suspense, lazy, type ReactNode } from "react";
import { useBoundProp, defineRegistry } from "@json-render/react";
import dynamic from "next/dynamic";
import { useLightbox } from "./lightbox";

// ---- Charts (recharts) — loaded eagerly since they're used very frequently ----
import {
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart as RechartsLineChart,
  Pie,
  PieChart as RechartsPieChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

// ---- Shadcn UI (lightweight, always needed) ----
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Avatar as ShadAvatar,
  AvatarImage,
  AvatarFallback,
} from "@/components/ui/avatar";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Accordion as AccordionRoot,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Info,
  Lightbulb,
  AlertTriangle,
  Star,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

// ---- Map (mapbox-gl ~300KB) — LAZY loaded, only when Map component renders ----
const LazyMapInner = dynamic(() => import("./lazy/map-inner"), {
  loading: () => <Skeleton className="w-full h-[400px] rounded-xl" />,
  ssr: false,
});

// ---- 3D (three.js + R3F + drei ~500KB) — LAZY loaded via React.lazy ----
const lazy3D = () => import("./lazy/scene3d-inner");
const LazyScene3D = lazy(() => lazy3D().then(m => ({ default: m.Scene3DInner })));
const LazyGroup3D = lazy(() => lazy3D().then(m => ({ default: m.Group3DInner })));
const LazyBox = lazy(() => lazy3D().then(m => ({ default: m.BoxInner })));
const LazySphere = lazy(() => lazy3D().then(m => ({ default: m.SphereInner })));
const LazyCylinder = lazy(() => lazy3D().then(m => ({ default: m.CylinderInner })));
const LazyCone = lazy(() => lazy3D().then(m => ({ default: m.ConeInner })));
const LazyTorus = lazy(() => lazy3D().then(m => ({ default: m.TorusInner })));
const LazyPlane = lazy(() => lazy3D().then(m => ({ default: m.PlaneInner })));
const LazyRing = lazy(() => lazy3D().then(m => ({ default: m.RingInner })));
const LazyAmbientLight = lazy(() => lazy3D().then(m => ({ default: m.AmbientLightInner })));
const LazyPointLight = lazy(() => lazy3D().then(m => ({ default: m.PointLightInner })));
const LazyDirectionalLight = lazy(() => lazy3D().then(m => ({ default: m.DirectionalLightInner })));
const LazyStars = lazy(() => lazy3D().then(m => ({ default: m.StarsInner })));
const LazyLabel3D = lazy(() => lazy3D().then(m => ({ default: m.Label3DInner })));

import { explorerCatalog } from "./catalog";

// =============================================================================
// Registry
// =============================================================================

export const { registry, handlers } = defineRegistry(explorerCatalog, {
  components: {
    Stack: ({ props, children }) => {
      const gapClass =
        { sm: "gap-2", md: "gap-4", lg: "gap-6" }[props.gap ?? "md"] ?? "gap-4";
      const alignClass =
        {
          start: "items-start",
          center: "items-center",
          end: "items-end",
          stretch: "items-stretch",
        }[props.align ?? "stretch"] ?? "items-stretch";
      const justifyClass =
        {
          start: "justify-start",
          center: "justify-center",
          end: "justify-end",
          between: "justify-between",
          around: "justify-around",
        }[props.justify ?? "start"] ?? "justify-start";
      return (
        <div
          className={`flex transition-[gap,flex-direction] duration-300 ease-in-out ${props.direction === "horizontal" ? "flex-row" : "flex-col"} ${gapClass} ${alignClass} ${justifyClass}`}
        >
          {children}
        </div>
      );
    },

    Card: ({ props, children }) => {
      const maxWidthClass =
        {
          xs: "max-w-xs",
          sm: "max-w-sm",
          md: "max-w-md",
          lg: "max-w-lg",
          xl: "max-w-xl",
          full: "max-w-full",
        }[props.maxWidth ?? "full"] ?? "max-w-full";
      const centeredClass = props.centered ? "mx-auto" : "";
      return (
        <Card className={`${maxWidthClass} ${centeredClass} w-full transition-[gap,min-height,opacity] duration-300 ease-in-out`}>
          {(props.title || props.description) && (
            <CardHeader>
              {props.title && <CardTitle>{props.title}</CardTitle>}
              {props.description && (
                <CardDescription>{props.description}</CardDescription>
              )}
            </CardHeader>
          )}
          <CardContent className="flex flex-col gap-4">{children}</CardContent>
        </Card>
      );
    },

    Grid: ({ props, children }) => {
      const colsClass =
        {
          "1": "grid-cols-1",
          "2": "grid-cols-1 md:grid-cols-2",
          "3": "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
          "4": "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
        }[props.columns ?? "3"] ?? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3";
      const gapClass =
        { sm: "gap-2", md: "gap-4", lg: "gap-6" }[props.gap ?? "md"] ?? "gap-4";
      return (
        <div className={`grid transition-[gap,grid-template-columns] duration-300 ease-in-out ${colsClass} ${gapClass}`}>
          {children}
        </div>
      );
    },

    Heading: ({ props }) => {
      const Tag = (props.level ?? "h2") as "h1" | "h2" | "h3" | "h4";
      const sizeClass = {
        h1: "text-3xl font-bold tracking-tight",
        h2: "text-2xl font-semibold tracking-tight",
        h3: "text-xl font-semibold",
        h4: "text-lg font-medium",
      }[props.level ?? "h2"];
      return <Tag className={sizeClass}>{props.text}</Tag>;
    },

    Text: ({ props }) => (
      <p className={props.muted ? "text-muted-foreground" : ""}>
        {props.content}
      </p>
    ),

    Badge: ({ props }) => (
      <Badge variant={props.variant ?? "default"}>{props.text}</Badge>
    ),

    Alert: ({ props }) => (
      <Alert variant={props.variant ?? "default"}>
        <AlertTitle>{props.title}</AlertTitle>
        {props.description ? (
          <AlertDescription>{props.description}</AlertDescription>
        ) : null}
      </Alert>
    ),

    Separator: ({ props }) => (
      <Separator orientation={props.orientation ?? "horizontal"} />
    ),

    Metric: ({ props }) => {
      const TrendIcon =
        props.trend === "up"
          ? TrendingUp
          : props.trend === "down"
            ? TrendingDown
            : Minus;
      const trendColor =
        props.trend === "up"
          ? "text-green-500"
          : props.trend === "down"
            ? "text-red-500"
            : "text-muted-foreground";
      return (
        <div className="flex flex-col gap-1">
          <p className="text-sm text-muted-foreground">{props.label}</p>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold">{props.value}</span>
            {props.trend && <TrendIcon className={`h-4 w-4 ${trendColor}`} />}
          </div>
          {props.detail && (
            <p className="text-xs text-muted-foreground">{props.detail}</p>
          )}
        </div>
      );
    },

    Table: ({ props }) => {
      const rawData = props.data;
      const rawItems: Array<Record<string, unknown>> = Array.isArray(rawData)
        ? rawData
        : Array.isArray((rawData as Record<string, unknown>)?.data)
          ? ((rawData as Record<string, unknown>).data as Array<
              Record<string, unknown>
            >)
          : [];

      // Deduplicate rows — LLM patch ordering can produce duplicate entries
      const items = deduplicateDataArray(rawItems);

      const [sortKey, setSortKey] = useState<string | null>(null);
      const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

      if (items.length === 0) {
        return (
          <div className="text-center py-4 text-muted-foreground">
            {props.emptyMessage ?? "No data"}
          </div>
        );
      }

      // Normalize columns: accept both { key, label } and { accessorKey, header }
      const normalizedColumns = (props.columns ?? []).map(
        (col: Record<string, unknown>, i: number) => ({
          key:
            (col.key as string) ??
            (col.accessorKey as string) ??
            `col-${i}`,
          label:
            (col.label as string) ??
            (col.header as string) ??
            (col.key as string) ??
            (col.accessorKey as string) ??
            "",
        }),
      );

      const sorted = sortKey
        ? [...items].sort((a, b) => {
            const av = a[sortKey];
            const bv = b[sortKey];
            // numeric comparison when both values are numbers
            if (typeof av === "number" && typeof bv === "number") {
              return sortDir === "asc" ? av - bv : bv - av;
            }
            const as = String(av ?? "");
            const bs = String(bv ?? "");
            return sortDir === "asc"
              ? as.localeCompare(bs)
              : bs.localeCompare(as);
          })
        : items;

      const handleSort = (key: string) => {
        if (sortKey === key) {
          setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        } else {
          setSortKey(key);
          setSortDir("asc");
        }
      };

      return (
        <Table>
          <TableHeader>
            <TableRow>
              {normalizedColumns.map((col) => {
                const SortIcon =
                  sortKey === col.key
                    ? sortDir === "asc"
                      ? ArrowUp
                      : ArrowDown
                    : ArrowUpDown;
                return (
                  <TableHead key={col.key}>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                      onClick={() => handleSort(col.key)}
                    >
                      {col.label}
                      <SortIcon className="h-3 w-3 text-muted-foreground" />
                    </button>
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((item, i) => (
              <TableRow key={i}>
                {normalizedColumns.map((col) => (
                  <TableCell key={col.key}>
                    {formatCellValue(item[col.key])}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      );
    },

    Link: ({ props }) => (
      <a
        href={props.href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary underline underline-offset-4 hover:text-primary/80"
      >
        {props.text}
      </a>
    ),

    Avatar: ({ props }) => (
      <ShadAvatar size={props.size ?? "default"}>
        <AvatarImage src={props.src} alt={props.alt} />
        <AvatarFallback>{props.fallback ?? "?"}</AvatarFallback>
      </ShadAvatar>
    ),

    Image: ({ props }) => {
      const { open } = useLightbox(props.src ?? "", props.alt ?? "");
      const roundedClass =
        {
          none: "rounded-none",
          sm: "rounded-sm",
          md: "rounded-md",
          lg: "rounded-lg",
          xl: "rounded-xl",
          full: "rounded-full",
        }[props.rounded ?? "md"] ?? "rounded-md";
      const alignStyle =
        props.align === "right"
          ? { marginLeft: "auto" }
          : props.align === "center"
            ? { marginLeft: "auto", marginRight: "auto" }
            : undefined;
      return (
        <button
          type="button"
          onClick={open}
          className={`${roundedClass} overflow-hidden flex-shrink-0 cursor-zoom-in group relative`}
          style={{
            width: props.width ?? "100%",
            height: props.height ?? "auto",
            display: "block",
            ...alignStyle,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={props.src}
            alt={props.alt}
            className="w-full h-full block"
            style={{
              objectFit: (props.objectFit as React.CSSProperties["objectFit"]) ?? "cover",
            }}
          />
          {/* Hover hint */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-150" />
        </button>
      );
    },

    BarChart: ({ props }) => {
      const rawData = props.data;
      const rawItems: Array<Record<string, unknown>> = Array.isArray(rawData)
        ? rawData
        : Array.isArray((rawData as Record<string, unknown>)?.data)
          ? ((rawData as Record<string, unknown>).data as Array<
            Record<string, unknown>
          >)
          : [];

      const { items, valueKey } = processChartData(
        rawItems,
        props.xKey,
        props.yKey,
        props.aggregate,
      );

      const chartColor = props.color ?? "var(--chart-1)";

      const chartConfig = {
        [valueKey]: {
          label: valueKey,
          color: chartColor,
        },
      } satisfies ChartConfig;

      if (items.length === 0) {
        return (
          <div className="text-center py-4 text-muted-foreground">
            No data available
          </div>
        );
      }

      return (
        <div className="w-full">
          {props.title && (
            <p className="text-sm font-medium mb-2">{props.title}</p>
          )}
          <ChartContainer
            config={chartConfig}
            className="min-h-[200px] w-full"
            style={{ height: props.height ?? 300 }}
          >
            <RechartsBarChart accessibilityLayer data={items}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar
                dataKey={valueKey}
                fill={`var(--color-${valueKey})`}
                radius={4}
              />
            </RechartsBarChart>
          </ChartContainer>
        </div>
      );
    },

    LineChart: ({ props }) => {
      const rawData = props.data;
      const rawItems: Array<Record<string, unknown>> = Array.isArray(rawData)
        ? rawData
        : Array.isArray((rawData as Record<string, unknown>)?.data)
          ? ((rawData as Record<string, unknown>).data as Array<
            Record<string, unknown>
          >)
          : [];

      const isMultiLine =
        Array.isArray(props.yKeys) && props.yKeys.length > 0;

      // --- Multi-line mode ---
      if (isMultiLine) {
        const items = rawItems.map((item) => ({
          ...item,
          label: String(item[props.xKey] ?? ""),
        }));

        const rawYKeys = props.yKeys! as Array<Record<string, unknown>>;
        const lineKeys = rawYKeys.map((lk, i) => ({
          key:
            (lk.key as string) ??
            (lk.dataKey as string) ??
            (lk.id as string) ??
            `line-${i}`,
          label:
            (lk.label as string) ??
            (lk.name as string) ??
            (lk.key as string) ??
            (lk.dataKey as string) ??
            "",
          color: (lk.color as string) ?? undefined,
        }));
        const chartConfig: ChartConfig = {};
        lineKeys.forEach((lk, i) => {
          chartConfig[lk.key] = {
            label: lk.label || lk.key,
            color: lk.color ?? CHART_COLORS[i % CHART_COLORS.length],
          };
        });

        if (items.length === 0) {
          return (
            <div className="text-center py-4 text-muted-foreground">
              No data available
            </div>
          );
        }

        return (
          <div className="w-full">
            {props.title && (
              <p className="text-sm font-medium mb-2">{props.title}</p>
            )}
            <ChartContainer
              config={chartConfig}
              className="min-h-[200px] w-full [&_svg]:overflow-visible"
              style={{ height: props.height ?? 300 }}
            >
              <RechartsLineChart
                accessibilityLayer
                data={items}
                margin={{ left: 0, right: 8 }}
              >
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                  interval={Math.max(0, Math.ceil(items.length / 4) - 1)}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={4}
                  width={40}
                  tickCount={5}
                  domain={["auto", "auto"]}
                  tickFormatter={(v: number) =>
                    v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)
                  }
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                {lineKeys.map((lk) => (
                  <Line
                    key={lk.key}
                    type="monotone"
                    dataKey={lk.key}
                    stroke={`var(--color-${lk.key})`}
                    strokeWidth={2}
                    dot={false}
                  />
                ))}
              </RechartsLineChart>
            </ChartContainer>
          </div>
        );
      }

      // --- Single-line mode (backwards compatible) ---
      const { items, valueKey } = processChartData(
        rawItems,
        props.xKey,
        props.yKey,
        props.aggregate,
      );

      const chartColor = props.color ?? "var(--chart-1)";

      const chartConfig = {
        [valueKey]: {
          label: valueKey,
          color: chartColor,
        },
      } satisfies ChartConfig;

      if (items.length === 0) {
        return (
          <div className="text-center py-4 text-muted-foreground">
            No data available
          </div>
        );
      }

      return (
        <div className="w-full">
          {props.title && (
            <p className="text-sm font-medium mb-2">{props.title}</p>
          )}
          <ChartContainer
            config={chartConfig}
            className="min-h-[200px] w-full [&_svg]:overflow-visible"
            style={{ height: props.height ?? 300 }}
          >
            <RechartsLineChart
              accessibilityLayer
              data={items}
              margin={{ left: 0, right: 8 }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
                interval={Math.max(0, Math.ceil(items.length / 4) - 1)}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={4}
                width={40}
                tickCount={5}
                domain={["auto", "auto"]}
                tickFormatter={(v: number) =>
                  v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)
                }
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line
                type="monotone"
                dataKey={valueKey}
                stroke={`var(--color-${valueKey})`}
                strokeWidth={2}
                dot={false}
              />
            </RechartsLineChart>
          </ChartContainer>
        </div>
      );
    },

    Tabs: ({ props, children }) => {
      const rawTabs = (props.tabs ?? []) as Array<Record<string, unknown>>;
      const normalizedTabs = rawTabs.map((tab, i) => ({
        value:
          (tab.value as string) ??
          (tab.id as string) ??
          (tab.key as string) ??
          `tab-${i}`,
        label:
          (tab.label as string) ??
          (tab.name as string) ??
          (tab.title as string) ??
          (tab.value as string) ??
          (tab.id as string) ??
          "",
      }));
      const fallback =
        props.defaultValue ?? normalizedTabs[0]?.value;

      return (
        <Tabs defaultValue={fallback}>
          <TabsList>
            {normalizedTabs.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {children}
        </Tabs>
      );
    },

    TabContent: ({ props, children }) => (
      <TabsContent
        value={props.value}
        forceMount
        className="data-[state=inactive]:hidden"
      >
        {children}
      </TabsContent>
    ),

    Progress: ({ props }) => (
      <div className="flex flex-col gap-1.5">
        {props.label && (
          <p className="text-sm text-muted-foreground">{props.label}</p>
        )}
        <Progress value={props.value} max={props.max ?? 100} />
      </div>
    ),

    Skeleton: ({ props }) => (
      <Skeleton
        className={`${props.width ?? "w-full"} ${props.height ?? "h-4"}`}
      />
    ),

    Callout: ({ props }) => {
      const config = {
        info: {
          icon: Info,
          border: "border-l-blue-500",
          bg: "bg-blue-500/5",
          iconColor: "text-blue-500",
        },
        tip: {
          icon: Lightbulb,
          border: "border-l-emerald-500",
          bg: "bg-emerald-500/5",
          iconColor: "text-emerald-500",
        },
        warning: {
          icon: AlertTriangle,
          border: "border-l-amber-500",
          bg: "bg-amber-500/5",
          iconColor: "text-amber-500",
        },
        important: {
          icon: Star,
          border: "border-l-purple-500",
          bg: "bg-purple-500/5",
          iconColor: "text-purple-500",
        },
      }[props.type ?? "info"] ?? {
        icon: Info,
        border: "border-l-blue-500",
        bg: "bg-blue-500/5",
        iconColor: "text-blue-500",
      };
      const Icon = config.icon;
      return (
        <div
          className={`border-l-4 ${config.border} ${config.bg} rounded-r-lg p-4`}
        >
          <div className="flex items-start gap-3">
            <Icon className={`h-5 w-5 mt-0.5 shrink-0 ${config.iconColor}`} />
            <div className="flex-1 min-w-0">
              {props.title && (
                <p className="font-semibold text-sm mb-1">{props.title}</p>
              )}
              <p className="text-sm text-muted-foreground">{props.content}</p>
            </div>
          </div>
        </div>
      );
    },

    Accordion: ({ props }) => {
      const rawItems = (props.items ?? []) as Array<Record<string, unknown>>;
      const normalizedItems = rawItems.map((item) => ({
        title:
          (item.title as string) ??
          (item.heading as string) ??
          (item.label as string) ??
          "",
        content:
          (item.content as string) ??
          (item.body as string) ??
          (item.description as string) ??
          "",
      }));
      return (
        <AccordionRoot
          type={props.type === "single" ? "single" : "multiple"}
          collapsible={props.type === "single" ? true : undefined}
          className="w-full"
        >
          {normalizedItems.map((item, i) => (
            <AccordionItem key={i} value={`item-${i}`}>
              <AccordionTrigger>{item.title}</AccordionTrigger>
              <AccordionContent>
                <p className="text-muted-foreground">{item.content}</p>
              </AccordionContent>
            </AccordionItem>
          ))}
        </AccordionRoot>
      );
    },

    Timeline: ({ props }) => {
      const rawItems = (props.items ?? []) as Array<Record<string, unknown>>;
      const normalizedItems = rawItems.map((item) => ({
        title:
          (item.title as string) ??
          (item.heading as string) ??
          (item.label as string) ??
          "",
        description:
          (item.description as string) ??
          (item.body as string) ??
          (item.detail as string) ??
          null,
        date:
          (item.date as string) ??
          (item.dateLabel as string) ??
          null,
        status: (item.status as "completed" | "current" | "upcoming") ?? null,
      }));
      return (
        <div className="relative pl-8">
          <div className="absolute left-[5.5px] top-3 bottom-3 w-px bg-border" />
          <div className="flex flex-col gap-6">
            {normalizedItems.map((item, i) => {
              const dotColor =
                item.status === "completed"
                  ? "bg-emerald-500"
                  : item.status === "current"
                    ? "bg-blue-500"
                    : "bg-muted-foreground/30";
              return (
                <div key={i} className="relative">
                  <div
                    className={`absolute -left-8 top-0.5 h-3 w-3 rounded-full ${dotColor} ring-2 ring-background`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm">{item.title}</p>
                      {item.date && (
                        <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                          {item.date}
                        </span>
                      )}
                    </div>
                    {item.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {item.description}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    },

    PieChart: ({ props }) => {
      const rawData = props.data;
      const items: Array<Record<string, unknown>> = Array.isArray(rawData)
        ? rawData
        : Array.isArray((rawData as Record<string, unknown>)?.data)
          ? ((rawData as Record<string, unknown>).data as Array<
            Record<string, unknown>
          >)
          : [];

      if (items.length === 0) {
        return (
          <div className="text-center py-4 text-muted-foreground">
            No data available
          </div>
        );
      }

      const chartConfig: ChartConfig = {};
      items.forEach((item, i) => {
        const name = String(item[props.nameKey] ?? `Segment ${i + 1}`);
        chartConfig[name] = {
          label: name,
          color: CHART_COLORS[i % CHART_COLORS.length],
        };
      });

      return (
        <div className="w-full">
          {props.title && (
            <p className="text-sm font-medium mb-2">{props.title}</p>
          )}
          <ChartContainer
            config={chartConfig}
            className="mx-auto aspect-square w-full"
            style={{ height: props.height ?? 300 }}
          >
            <RechartsPieChart>
              <ChartTooltip content={<ChartTooltipContent />} />
              <Pie
                data={items.map((item, i) => ({
                  name: String(item[props.nameKey] ?? `Segment ${i + 1}`),
                  value:
                    typeof item[props.valueKey] === "number"
                      ? item[props.valueKey]
                      : parseFloat(String(item[props.valueKey])) || 0,
                  fill: CHART_COLORS[i % CHART_COLORS.length],
                }))}
                dataKey="value"
                nameKey="name"
                innerRadius="40%"
                outerRadius="70%"
                paddingAngle={2}
              />
              <Legend />
            </RechartsPieChart>
          </ChartContainer>
        </div>
      );
    },

    RadioGroup: ({ props, bindings }) => {
      const [value, setValue] = useBoundProp<string>(
        props.value as string | undefined,
        bindings?.value,
      );
      const current = value ?? "";

      const rawOptions = (props.options ?? []) as Array<Record<string, unknown>>;
      const normalizedOptions = rawOptions.map((opt, i) => ({
        value:
          (opt.value as string) ??
          (opt.id as string) ??
          (opt.key as string) ??
          `opt-${i}`,
        label:
          (opt.label as string) ??
          (opt.text as string) ??
          (opt.name as string) ??
          (opt.value as string) ??
          (opt.id as string) ??
          "",
      }));

      return (
        <div className="flex flex-col gap-2">
          {props.label && (
            <Label className="text-sm font-medium">{props.label}</Label>
          )}
          <RadioGroup
            value={current}
            onValueChange={(v: string) => setValue(v)}
          >
            {normalizedOptions.map((opt) => (
              <div key={opt.value} className="flex items-center gap-2">
                <RadioGroupItem value={opt.value} id={`rg-${opt.value}`} />
                <Label
                  htmlFor={`rg-${opt.value}`}
                  className="font-normal cursor-pointer"
                >
                  {opt.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>
      );
    },

    SelectInput: ({ props, bindings }) => {
      const [value, setValue] = useBoundProp<string>(
        props.value as string | undefined,
        bindings?.value,
      );
      const current = value ?? "";

      const rawOptions = (props.options ?? []) as Array<Record<string, unknown>>;
      const normalizedOptions = rawOptions.map((opt, i) => ({
        value:
          (opt.value as string) ??
          (opt.id as string) ??
          (opt.key as string) ??
          `opt-${i}`,
        label:
          (opt.label as string) ??
          (opt.text as string) ??
          (opt.name as string) ??
          (opt.value as string) ??
          (opt.id as string) ??
          "",
      }));

      return (
        <div className="flex flex-col gap-2">
          {props.label && (
            <Label className="text-sm font-medium">{props.label}</Label>
          )}
          <Select value={current} onValueChange={(v: string) => setValue(v)}>
            <SelectTrigger>
              <SelectValue placeholder={props.placeholder ?? "Select..."} />
            </SelectTrigger>
            <SelectContent>
              {normalizedOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    },

    TextInput: ({ props, bindings }) => {
      const [value, setValue] = useBoundProp<string>(
        props.value as string | undefined,
        bindings?.value,
      );
      const current = value ?? "";

      return (
        <div className="flex flex-col gap-2">
          {props.label && (
            <Label className="text-sm font-medium">{props.label}</Label>
          )}
          <Input
            type={props.type ?? "text"}
            placeholder={props.placeholder ?? ""}
            value={current}
            onChange={(e) => setValue(e.target.value)}
          />
        </div>
      );
    },

    Button: ({ props, emit }) => (
      <Button
        variant={props.variant ?? "default"}
        size={props.size ?? "default"}
        disabled={props.disabled ?? false}
        onClick={() => emit("press")}
      >
        {props.label}
      </Button>
    ),

    // =========================================================================
    // Map Component — lazy-loaded (mapbox-gl ~300KB only loaded when needed)
    // =========================================================================

    Map: ({ props }) => (
      <LazyMapInner
        latitude={props.latitude}
        longitude={props.longitude}
        zoom={props.zoom}
        height={props.height}
        mapStyle={props.mapStyle}
        markers={props.markers as any}
      />
    ),

    // =========================================================================
    // 3D Scene Components — lazy-loaded (three.js + R3F ~500KB only when needed)
    // =========================================================================

    Scene3D: ({ props, children }) => (
      <Suspense fallback={<Skeleton className="w-full h-[400px] rounded-lg" />}>
        <LazyScene3D
          height={props.height}
          background={props.background}
          cameraPosition={props.cameraPosition}
          cameraFov={props.cameraFov}
          autoRotate={props.autoRotate}
        >
          {children}
        </LazyScene3D>
      </Suspense>
    ),

    Group3D: ({ props, children }) => (
      <Suspense fallback={null}>
        <LazyGroup3D
          position={props.position}
          rotation={props.rotation}
          scale={props.scale}
          animation={props.animation}
        >
          {children}
        </LazyGroup3D>
      </Suspense>
    ),

    Box: ({ props, emit }) => (
      <Suspense fallback={null}>
        <LazyBox props={props as any} onClick={() => emit("press")} />
      </Suspense>
    ),

    Sphere: ({ props, emit }) => (
      <Suspense fallback={null}>
        <LazySphere props={props as any} onClick={() => emit("press")} />
      </Suspense>
    ),

    Cylinder: ({ props, emit }) => (
      <Suspense fallback={null}>
        <LazyCylinder props={props as any} onClick={() => emit("press")} />
      </Suspense>
    ),

    Cone: ({ props, emit }) => (
      <Suspense fallback={null}>
        <LazyCone props={props as any} onClick={() => emit("press")} />
      </Suspense>
    ),

    Torus: ({ props, emit }) => (
      <Suspense fallback={null}>
        <LazyTorus props={props as any} onClick={() => emit("press")} />
      </Suspense>
    ),

    Plane: ({ props, emit }) => (
      <Suspense fallback={null}>
        <LazyPlane props={props as any} onClick={() => emit("press")} />
      </Suspense>
    ),

    Ring: ({ props, emit }) => (
      <Suspense fallback={null}>
        <LazyRing props={props as any} onClick={() => emit("press")} />
      </Suspense>
    ),

    AmbientLight: ({ props }) => (
      <Suspense fallback={null}>
        <LazyAmbientLight color={props.color} intensity={props.intensity} />
      </Suspense>
    ),

    PointLight: ({ props }) => (
      <Suspense fallback={null}>
        <LazyPointLight position={props.position} color={props.color} intensity={props.intensity} distance={props.distance} />
      </Suspense>
    ),

    DirectionalLight: ({ props }) => (
      <Suspense fallback={null}>
        <LazyDirectionalLight position={props.position} color={props.color} intensity={props.intensity} />
      </Suspense>
    ),

    Stars: ({ props }) => (
      <Suspense fallback={null}>
        <LazyStars radius={props.radius} depth={props.depth} count={props.count} factor={props.factor} fade={props.fade} speed={props.speed} />
      </Suspense>
    ),

    Label3D: ({ props }) => (
      <Suspense fallback={null}>
        <LazyLabel3D position={props.position} rotation={props.rotation} color={props.color} fontSize={props.fontSize} anchorX={props.anchorX} anchorY={props.anchorY} text={props.text} />
      </Suspense>
    ),

    // =========================================================================
    // 2D Scene Components (SVG)
    // =========================================================================

    Scene2D: ({ props, children }) => (
      <svg
        width={props.width ?? "100%"}
        height={props.height ?? "300px"}
        viewBox={props.viewBox ?? undefined}
        style={{
          backgroundColor: props.background ?? undefined,
          display: "block",
          borderRadius: "0.5rem",
        }}
      >
        {children}
      </svg>
    ),

    Group2D: ({ props, children }) => {
      let transform = props.transform ?? "";
      if (!transform) {
        const parts: string[] = [];
        if (props.x || props.y) parts.push(`translate(${props.x ?? 0}, ${props.y ?? 0})`);
        if (props.rotation) parts.push(`rotate(${props.rotation})`);
        if (props.scale) parts.push(`scale(${props.scale})`);
        transform = parts.join(" ");
      }
      return <g transform={transform}>{children}</g>;
    },

    Rect: ({ props }) => (
      <rect
        x={props.x}
        y={props.y}
        width={props.width}
        height={props.height}
        fill={props.fill ?? undefined}
        stroke={props.stroke ?? undefined}
        strokeWidth={props.strokeWidth ?? undefined}
        rx={props.rx ?? undefined}
      />
    ),

    Circle: ({ props }) => (
      <circle
        cx={props.cx}
        cy={props.cy}
        r={props.r}
        fill={props.fill ?? undefined}
        stroke={props.stroke ?? undefined}
        strokeWidth={props.strokeWidth ?? undefined}
      />
    ),

    Line: ({ props }) => (
      <line
        x1={props.x1}
        y1={props.y1}
        x2={props.x2}
        y2={props.y2}
        stroke={props.stroke ?? undefined}
        strokeWidth={props.strokeWidth ?? undefined}
        strokeDasharray={props.strokeDasharray ?? undefined}
      />
    ),

    Path: ({ props }) => (
      <path
        d={props.d}
        fill={props.fill ?? undefined}
        stroke={props.stroke ?? undefined}
        strokeWidth={props.strokeWidth ?? undefined}
      />
    ),

    Text2D: ({ props }) => (
      <text
        x={props.x}
        y={props.y}
        fontSize={props.fontSize ?? undefined}
        fill={props.fill ?? undefined}
        textAnchor={props.textAnchor ?? undefined}
        dominantBaseline={props.dominantBaseline ?? undefined}
        fontWeight={props.fontWeight ?? undefined}
      >
        {props.text}
      </text>
    ),
  },

  actions: {},
});

// =============================================================================
// Table Helpers
// =============================================================================

/** Deduplicate an array of data objects by JSON content equality. */
function deduplicateDataArray<T>(arr: T[]): T[] {
  if (arr.length === 0) return arr;
  const seen = new Set<string>();
  const unique: T[] = [];
  for (const item of arr) {
    const key =
      item && typeof item === "object"
        ? JSON.stringify(item)
        : String(item);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(item);
  }
  return unique.length === arr.length ? arr : unique;
}

/** Render a table cell value as a readable string, handling nested objects. */
function formatCellValue(value: unknown): string {
  if (value == null) return "";
  if (typeof value !== "object") return String(value);
  // Common patterns: { text: "..." }, { name: "..." }, { label: "..." }
  const obj = value as Record<string, unknown>;
  if (typeof obj.text === "string") return obj.text;
  if (typeof obj.name === "string") return obj.name;
  if (typeof obj.label === "string") return obj.label;
  // Arrays: join values
  if (Array.isArray(value)) return value.map(formatCellValue).join(", ");
  // Fallback: compact JSON
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

// (Mapbox helpers moved to ./lazy/map-inner.tsx for code-splitting)

// =============================================================================
// Chart Helpers
// =============================================================================

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

function processChartData(
  items: Array<Record<string, unknown>>,
  xKey: string,
  yKey: string,
  aggregate: "sum" | "count" | "avg" | null | undefined,
): { items: Array<Record<string, unknown>>; valueKey: string } {
  if (items.length === 0) {
    return { items: [], valueKey: yKey };
  }

  if (!aggregate) {
    const formatted = items.map((item) => ({
      ...item,
      label: String(item[xKey] ?? ""),
    }));
    return { items: formatted, valueKey: yKey };
  }

  const groups = new Map<string, Array<Record<string, unknown>>>();

  for (const item of items) {
    const groupKey = String(item[xKey] ?? "unknown");
    const group = groups.get(groupKey) ?? [];
    group.push(item);
    groups.set(groupKey, group);
  }

  const valueKey = aggregate === "count" ? "count" : yKey;
  const aggregated: Array<Record<string, unknown>> = [];
  const sortedKeys = Array.from(groups.keys()).sort();

  for (const key of sortedKeys) {
    const group = groups.get(key)!;
    let value: number;

    if (aggregate === "count") {
      value = group.length;
    } else if (aggregate === "sum") {
      value = group.reduce((sum, item) => {
        const v = item[yKey];
        return sum + (typeof v === "number" ? v : parseFloat(String(v)) || 0);
      }, 0);
    } else {
      const sum = group.reduce((s, item) => {
        const v = item[yKey];
        return s + (typeof v === "number" ? v : parseFloat(String(v)) || 0);
      }, 0);
      value = group.length > 0 ? sum / group.length : 0;
    }

    aggregated.push({ label: key, [valueKey]: value });
  }

  return { items: aggregated, valueKey };
}

// =============================================================================
// Fallback Component
// =============================================================================

export function Fallback({ type }: { type: string }) {
  return (
    <div className="p-4 border border-dashed rounded-lg text-muted-foreground text-sm">
      Unknown component: {type}
    </div>
  );
}