import * as React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  TooltipProps
} from "recharts";
import { format, parseISO } from "date-fns";

interface ChartData {
  date: string;
  amount: number;
}

interface AnalyticsChartProps {
  data: ChartData[];
  type: 'earnings' | 'bookings';
  color?: string;
}

const CustomTooltip = ({ 
  active, 
  payload, 
  label,
  type 
}: TooltipProps<number, string> & { type: 'earnings' | 'bookings' }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border rounded-lg shadow-lg">
        <p className="text-sm font-medium text-gray-900">
          {format(parseISO(label), 'MMM d, yyyy')}
        </p>
        <p className="text-sm text-gray-600 mt-1">
          {type === 'earnings' ? (
            <>₦{payload[0].value?.toLocaleString()}</>
          ) : (
            <>{payload[0].value} bookings</>
          )}
        </p>
      </div>
    );
  }

  return null;
};

export function AnalyticsChart({ data, type, color = "#10b981" }: AnalyticsChartProps) {
  // Format data for the chart
  const chartData = React.useMemo(() => {
    return data.map(item => ({
      ...item,
      date: format(parseISO(item.date), 'MMM d')
    }));
  }, [data]);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart
        data={chartData}
        margin={{
          top: 5,
          right: 10,
          left: 10,
          bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          dataKey="date"
          stroke="#9ca3af"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="#9ca3af"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={value => 
            type === 'earnings' 
              ? `₦${value.toLocaleString()}`
              : value.toString()
          }
        />
        <Tooltip
          content={({ active, payload, label }) => (
            <CustomTooltip
              active={active}
              payload={payload}
              label={label}
              type={type}
            />
          )}
        />
        <Line
          type="monotone"
          dataKey="amount"
          stroke={color}
          strokeWidth={2}
          dot={false}
          activeDot={{
            r: 4,
            strokeWidth: 2,
            stroke: "#fff"
          }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
} 