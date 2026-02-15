"use client";

import { useState, useRef, useCallback, type ReactNode } from "react";
import { useBoundProp, defineRegistry } from "@json-render/react";
import ReactMapGL, {
  Marker as MapboxMarker,
  Popup as MapboxPopup,
  NavigationControl,
} from "react-map-gl/mapbox";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
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
  X,
  MapPin,
  StarHalf,
} from "lucide-react";

// 3D imports
import { Canvas, useFrame } from "@react-three/fiber";
import {
  OrbitControls,
  Stars as DreiStars,
  Text as DreiText,
} from "@react-three/drei";
import type * as THREE from "three";

import { explorerCatalog } from "./catalog";

// =============================================================================
// 3D Helper Types & Components
// =============================================================================

type Vec3Tuple = [number, number, number];

interface Animation3D {
  rotate?: number[] | null;
}

interface Mesh3DProps {
  position?: number[] | null;
  rotation?: number[] | null;
  scale?: number[] | null;
  color?: string | null;
  args?: number[] | null;
  metalness?: number | null;
  roughness?: number | null;
  emissive?: string | null;
  emissiveIntensity?: number | null;
  wireframe?: boolean | null;
  opacity?: number | null;
  animation?: Animation3D | null;
}

function toVec3(v: number[] | null | undefined): Vec3Tuple | undefined {
  if (!v || v.length < 3) return undefined;
  return v.slice(0, 3) as Vec3Tuple;
}

function toGeoArgs<T extends unknown[]>(
  v: number[] | null | undefined,
  fallback: T,
): T {
  if (!v || v.length === 0) return fallback;
  return v as unknown as T;
}

/** Shared hook for continuous rotation animation */
function useRotationAnimation(
  ref: React.RefObject<THREE.Object3D | null>,
  animation?: Animation3D | null,
) {
  useFrame(() => {
    if (!ref.current || !animation?.rotate) return;
    const [rx, ry, rz] = animation.rotate;
    ref.current.rotation.x += rx ?? 0;
    ref.current.rotation.y += ry ?? 0;
    ref.current.rotation.z += rz ?? 0;
  });
}

/** Standard material props shared by all mesh primitives */
function StandardMaterial({
  color,
  metalness,
  roughness,
  emissive,
  emissiveIntensity,
  wireframe,
  opacity,
}: Mesh3DProps) {
  return (
    <meshStandardMaterial
      color={color ?? "#cccccc"}
      metalness={metalness ?? 0.1}
      roughness={roughness ?? 0.8}
      emissive={emissive ?? undefined}
      emissiveIntensity={emissiveIntensity ?? 1}
      wireframe={wireframe ?? false}
      transparent={opacity != null && opacity < 1}
      opacity={opacity ?? 1}
    />
  );
}

/** Generic mesh wrapper for all geometry primitives */
function MeshPrimitive({
  meshProps,
  children,
  onClick,
}: {
  meshProps: Mesh3DProps;
  children: ReactNode;
  onClick?: () => void;
}) {
  const ref = useRef<THREE.Mesh>(null);
  useRotationAnimation(ref, meshProps.animation);
  return (
    <mesh
      ref={ref}
      position={toVec3(meshProps.position)}
      rotation={toVec3(meshProps.rotation)}
      scale={toVec3(meshProps.scale)}
      onClick={onClick}
    >
      {children}
      <StandardMaterial {...meshProps} />
    </mesh>
  );
}

/** Animated group wrapper */
function AnimatedGroup({
  position,
  rotation,
  scale,
  animation,
  children,
}: {
  position?: number[] | null;
  rotation?: number[] | null;
  scale?: number[] | null;
  animation?: Animation3D | null;
  children?: ReactNode;
}) {
  const ref = useRef<THREE.Group>(null);
  useRotationAnimation(ref, animation);
  return (
    <group
      ref={ref}
      position={toVec3(position)}
      rotation={toVec3(rotation)}
      scale={toVec3(scale)}
    >
      {children}
    </group>
  );
}

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
          className={`flex ${props.direction === "horizontal" ? "flex-row" : "flex-col"} ${gapClass} ${alignClass} ${justifyClass}`}
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
        <Card className={`${maxWidthClass} ${centeredClass} w-full`}>
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
      return <div className={`grid ${colsClass} ${gapClass}`}>{children}</div>;
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
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={props.src}
          alt={props.alt}
          className={`${roundedClass} overflow-hidden flex-shrink-0`}
          style={{
            width: props.width ?? "100%",
            height: props.height ?? "auto",
            objectFit: (props.objectFit as React.CSSProperties["objectFit"]) ?? "cover",
            ...alignStyle,
          }}
        />
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
    // Map Components (Google Maps-style with overlay panel)
    // =========================================================================

    Map: ({ props }) => {
      const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
      const mapRef = useRef<mapboxgl.Map | null>(null);

      const mapStyle =
        MAPBOX_STYLES[props.mapStyle ?? "streets"] ?? MAPBOX_STYLES.streets;

      const markers = (
        Array.isArray(props.markers) ? props.markers : []
      ) as Array<Record<string, unknown>>;

      const handleSelectMarker = useCallback(
        (idx: number) => {
          setSelectedIdx((prev) => (prev === idx ? null : idx));
          const m = markers[idx];
          if (!m) return;
          const lat = (m.latitude ?? m.lat) as number;
          const lng = (m.longitude ?? m.lng ?? m.lon) as number;
          if (mapRef.current) {
            mapRef.current.flyTo({
              center: [lng, lat],
              zoom: Math.max(mapRef.current.getZoom(), 14),
              duration: 800,
            });
          }
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [markers.length],
      );

      const selectedMarker =
        selectedIdx != null ? markers[selectedIdx] : null;

      return (
        <div
          className="relative w-full"
          style={{
            height: props.height ?? "550px",
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          {/* ---- Full-bleed Map Background ---- */}
          <ReactMapGL
            initialViewState={{
              latitude: props.latitude,
              longitude: props.longitude,
              zoom: props.zoom ?? 12,
            }}
            mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_API_KEY}
            mapStyle={mapStyle}
            style={{ width: "100%", height: "100%" }}
            ref={(r) => {
              if (r) mapRef.current = r.getMap();
            }}
            onClick={() => setSelectedIdx(null)}
          >
            <NavigationControl position="top-right" />

            {markers.map((marker, i) => {
              const m = marker as Record<string, unknown>;
              const lat = (m.latitude ?? m.lat) as number;
              const lng = (m.longitude ?? m.lng ?? m.lon) as number;
              const color = (m.color as string) ?? "#EF4444";
              const isSelected = selectedIdx === i;

              return (
                <MapboxMarker
                  key={i}
                  latitude={lat}
                  longitude={lng}
                  anchor="bottom"
                  onClick={(e: { originalEvent: MouseEvent }) => {
                    e.originalEvent.stopPropagation();
                    handleSelectMarker(i);
                  }}
                >
                  <div
                    className="transition-transform duration-200"
                    style={{
                      transform: isSelected ? "scale(1.3)" : "scale(1)",
                      filter: isSelected
                        ? "drop-shadow(0 0 6px rgba(0,0,0,0.4))"
                        : "none",
                    }}
                  >
                    <svg
                      width="28"
                      height="40"
                      viewBox="0 0 24 36"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M12 0C5.372 0 0 5.372 0 12c0 9 12 24 12 24s12-15 12-24c0-6.628-5.372-12-12-12z"
                        fill={isSelected ? "#1d4ed8" : color}
                      />
                      <circle cx="12" cy="12" r="5" fill="white" />
                    </svg>
                  </div>
                </MapboxMarker>
              );
            })}
          </ReactMapGL>

          {/* ---- Left Overlay Panel ---- */}
          {markers.length > 0 && (
            <div
              className="absolute top-3 left-3 bottom-3 flex flex-col z-10"
              style={{ width: 340, maxWidth: "45%" }}
            >
              <div className="flex flex-col h-full bg-background/95 backdrop-blur-md rounded-xl shadow-xl border border-border/50 overflow-hidden">
                {/* Panel header */}
                <div className="px-4 py-3 border-b border-border/50 shrink-0">
                  <p className="text-sm font-semibold text-foreground">
                    {markers.length} location{markers.length !== 1 ? "s" : ""}
                  </p>
                </div>

                {/* Scrollable list */}
                <div className="flex-1 overflow-y-auto overscroll-contain">
                  {markers.map((marker, i) => {
                    const m = marker as Record<string, unknown>;
                    const label =
                      (m.label ?? m.name ?? m.title) as string | null;
                    const description = m.description as string | null;
                    const address = m.address as string | null;
                    const rating = m.rating as number | null;
                    const image = m.image as string | null;
                    const category = m.category as string | null;
                    const isSelected = selectedIdx === i;

                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleSelectMarker(i)}
                        className={`w-full text-left px-4 py-3 border-b border-border/30 transition-colors cursor-pointer hover:bg-accent/50 ${
                          isSelected ? "bg-accent" : ""
                        }`}
                      >
                        <div className="flex gap-3">
                          {/* Thumbnail */}
                          {image && (
                            <div className="shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-muted">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={image}
                                alt={label ?? ""}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            {/* Name */}
                            <p className="text-sm font-semibold text-foreground truncate">
                              {label ?? `Location ${i + 1}`}
                            </p>

                            {/* Rating + Category row */}
                            {(rating != null || category) && (
                              <div className="flex items-center gap-2 mt-0.5">
                                {rating != null && (
                                  <div className="flex items-center gap-0.5">
                                    <span className="text-xs font-medium text-foreground">
                                      {rating.toFixed(1)}
                                    </span>
                                    <div className="flex">
                                      {renderStars(rating)}
                                    </div>
                                  </div>
                                )}
                                {category && (
                                  <span className="text-xs text-muted-foreground">
                                    · {category}
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Address */}
                            {address && (
                              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                {address}
                              </p>
                            )}

                            {/* Description (only when selected) */}
                            {isSelected && description && (
                              <p className="text-xs text-muted-foreground mt-1.5 line-clamp-3">
                                {description}
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Expanded detail card for selected marker */}
                {selectedMarker && (
                  <div className="shrink-0 border-t border-border/50 bg-background p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold text-foreground truncate">
                          {(selectedMarker.label ??
                            selectedMarker.name ??
                            selectedMarker.title) as string}
                        </h3>
                        {(selectedMarker.category as string) && (
                          <Badge
                            variant="secondary"
                            className="mt-1 text-[10px] px-1.5 py-0"
                          >
                            {selectedMarker.category as string}
                          </Badge>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedIdx(null)}
                        className="shrink-0 p-1 rounded-md hover:bg-accent transition-colors"
                      >
                        <X className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    </div>

                    {(selectedMarker.rating as number) != null && (
                      <div className="flex items-center gap-1.5 mt-2">
                        <span className="text-sm font-semibold">
                          {(selectedMarker.rating as number).toFixed(1)}
                        </span>
                        <div className="flex">
                          {renderStars(selectedMarker.rating as number)}
                        </div>
                      </div>
                    )}

                    {(selectedMarker.address as string) && (
                      <div className="flex items-start gap-1.5 mt-2">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                        <p className="text-xs text-muted-foreground">
                          {selectedMarker.address as string}
                        </p>
                      </div>
                    )}

                    {(selectedMarker.description as string) && (
                      <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                        {selectedMarker.description as string}
                      </p>
                    )}

                    {(selectedMarker.image as string) && (
                      <div className="mt-3 rounded-lg overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={selectedMarker.image as string}
                          alt={
                            (selectedMarker.label as string) ?? "Location"
                          }
                          className="w-full h-32 object-cover"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      );
    },

    // =========================================================================
    // 3D Scene Components
    // =========================================================================

    Scene3D: ({ props, children }) => (
      <div
        style={{
          height: props.height ?? "400px",
          width: "100%",
          background: props.background ?? "#111111",
          borderRadius: 8,
          overflow: "hidden",
        }}
      >
        <Canvas
          camera={{
            position: toVec3(props.cameraPosition) ?? [0, 10, 30],
            fov: props.cameraFov ?? 50,
          }}
        >
          <OrbitControls
            autoRotate={props.autoRotate ?? false}
            enablePan
            enableZoom
          />
          {children}
        </Canvas>
      </div>
    ),

    Group3D: ({ props, children }) => (
      <AnimatedGroup
        position={props.position}
        rotation={props.rotation}
        scale={props.scale}
        animation={props.animation}
      >
        {children}
      </AnimatedGroup>
    ),

    Box: ({ props, emit }) => (
      <MeshPrimitive meshProps={props} onClick={() => emit("press")}>
        <boxGeometry
          args={toGeoArgs<[number, number, number]>(props.args, [1, 1, 1])}
        />
      </MeshPrimitive>
    ),

    Sphere: ({ props, emit }) => (
      <MeshPrimitive meshProps={props} onClick={() => emit("press")}>
        <sphereGeometry
          args={toGeoArgs<[number, number, number]>(props.args, [1, 32, 32])}
        />
      </MeshPrimitive>
    ),

    Cylinder: ({ props, emit }) => (
      <MeshPrimitive meshProps={props} onClick={() => emit("press")}>
        <cylinderGeometry
          args={toGeoArgs<[number, number, number, number]>(
            props.args,
            [1, 1, 2, 32],
          )}
        />
      </MeshPrimitive>
    ),

    Cone: ({ props, emit }) => (
      <MeshPrimitive meshProps={props} onClick={() => emit("press")}>
        <coneGeometry
          args={toGeoArgs<[number, number, number]>(props.args, [1, 2, 32])}
        />
      </MeshPrimitive>
    ),

    Torus: ({ props, emit }) => (
      <MeshPrimitive meshProps={props} onClick={() => emit("press")}>
        <torusGeometry
          args={toGeoArgs<[number, number, number, number]>(
            props.args,
            [1, 0.4, 16, 100],
          )}
        />
      </MeshPrimitive>
    ),

    Plane: ({ props, emit }) => (
      <MeshPrimitive meshProps={props} onClick={() => emit("press")}>
        <planeGeometry
          args={toGeoArgs<[number, number]>(props.args, [10, 10])}
        />
      </MeshPrimitive>
    ),

    Ring: ({ props, emit }) => (
      <MeshPrimitive meshProps={props} onClick={() => emit("press")}>
        <ringGeometry
          args={toGeoArgs<[number, number, number]>(props.args, [0.5, 1, 64])}
        />
      </MeshPrimitive>
    ),

    AmbientLight: ({ props }) => (
      <ambientLight
        color={props.color ?? undefined}
        intensity={props.intensity ?? 0.5}
      />
    ),

    PointLight: ({ props }) => (
      <pointLight
        position={toVec3(props.position)}
        color={props.color ?? undefined}
        intensity={props.intensity ?? 1}
        distance={props.distance ?? 0}
      />
    ),

    DirectionalLight: ({ props }) => (
      <directionalLight
        position={toVec3(props.position)}
        color={props.color ?? undefined}
        intensity={props.intensity ?? 1}
      />
    ),

    Stars: ({ props }) => (
      <DreiStars
        radius={props.radius ?? 100}
        depth={props.depth ?? 50}
        count={props.count ?? 5000}
        factor={props.factor ?? 4}
        fade={props.fade ?? true}
        speed={props.speed ?? 1}
      />
    ),

    Label3D: ({ props }) => (
      <DreiText
        position={toVec3(props.position)}
        rotation={toVec3(props.rotation)}
        color={props.color ?? "#ffffff"}
        fontSize={props.fontSize ?? 1}
        anchorX={props.anchorX ?? "center"}
        anchorY={props.anchorY ?? "middle"}
      >
        {props.text}
      </DreiText>
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

// =============================================================================
// Mapbox Helpers
// =============================================================================

/** Render star icons for a rating (0-5). */
function renderStars(rating: number): ReactNode[] {
  const stars: ReactNode[] = [];
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.25 && rating - fullStars < 0.75;
  const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);

  for (let i = 0; i < fullStars; i++) {
    stars.push(
      <Star
        key={`full-${i}`}
        className="h-3 w-3 text-yellow-500 fill-yellow-500"
      />,
    );
  }
  if (hasHalf) {
    stars.push(
      <StarHalf
        key="half"
        className="h-3 w-3 text-yellow-500 fill-yellow-500"
      />,
    );
  }
  for (let i = 0; i < emptyStars; i++) {
    stars.push(
      <Star
        key={`empty-${i}`}
        className="h-3 w-3 text-muted-foreground/30"
      />,
    );
  }
  return stars;
}

const MAPBOX_STYLES: Record<string, string> = {
  streets: "mapbox://styles/mapbox/streets-v12",
  outdoors: "mapbox://styles/mapbox/outdoors-v12",
  light: "mapbox://styles/mapbox/light-v11",
  dark: "mapbox://styles/mapbox/dark-v11",
  satellite: "mapbox://styles/mapbox/satellite-v9",
  "satellite-streets": "mapbox://styles/mapbox/satellite-streets-v12",
};

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