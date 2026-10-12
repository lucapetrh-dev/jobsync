"use client";
import { useState } from "react";
import { ResponsiveCalendar } from "@nivo/calendar";
import { format, parseISO } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
// make sure parent container have a defined height when using
// responsive component, otherwise height will be 0 and
// no chart will be rendered.
// website examples showcase many properties,
// you'll often use just a few of them.
export default function ActivityCalendar({
  years,
  dataByYear,
}: {
  years: string[];
  dataByYear: Record<string, any[]>;
}) {
  const [year, setYear] = useState(years.at(-1) ?? String(new Date().getFullYear()));
  const borderColor = "hsl(var(--card))";
  const data = dataByYear[year ?? ""] ?? [];
  const hoursMap = Object.fromEntries(
    data.map((d) => [d.day, d.hours ?? 0]),
  );
  return (
    <Card className="w-[100%]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base text-foreground">Activity Calendar</CardTitle>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-[100px]" aria-label="Select year">
              <SelectValue placeholder="Select year" />
            </SelectTrigger>
            <SelectContent>
              {(years.length ? years : [year]).map((y) => (
                <SelectItem key={y} value={y}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <div className="h-[200px] min-w-[640px]">
        <ResponsiveCalendar
          data={data}
          from={`${year}-04-02`}
          to={`${year}-04-02`}
          emptyColor="hsl(var(--muted))"
          colors={["#90e0ef", "#48cae4", "#00b4d8", "#0096c7", "#0077b6"]}
          minValue={2}
          margin={{ top: 20, right: 0, bottom: 20, left: 0 }}
          yearSpacing={40}
          monthBorderColor={borderColor}
          dayBorderWidth={2}
          dayBorderColor={borderColor}
          tooltip={(day) => {
            const hours = hoursMap[day.day] ?? 0;
            return (
              <div
                style={{
                  background: "hsl(var(--popover))",
                  color: "hsl(var(--popover-foreground))",
                  padding: "6px 12px",
                  borderRadius: "4px",
                  fontSize: "12px",
                  whiteSpace: "nowrap",
                }}
              >
                <div><strong>{format(parseISO(day.day), "EEE MMM d, yyyy")}</strong></div>
                <div>{day.value} job{Number(day.value) === 1 ? "" : "s"} applied</div>
                <div>{hours} hr{hours === 1 ? "" : "s"} activity</div>
              </div>
            );
          }}
          theme={{
            text: {
              fill: "hsl(var(--muted-foreground))",
            },
            tooltip: {
              container: {
                background: "hsl(var(--popover))",
                color: "hsl(var(--popover-foreground))",
              },
            },
          }}
          legends={[
            {
              anchor: "bottom-right",
              direction: "row",
              translateY: 36,
              itemCount: 4,
              itemWidth: 42,
              itemHeight: 36,
              itemsSpacing: 14,
              itemDirection: "right-to-left",
            },
          ]}
        />
        </div>
      </CardContent>
    </Card>
  );
}
