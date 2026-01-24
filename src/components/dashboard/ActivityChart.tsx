import { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface ActivityChartProps {
  data?: { time: string; messages: number }[];
}

export function ActivityChart({ data }: ActivityChartProps) {
  const chartData = useMemo(() => {
    if (data) return data;
    
    // Generate mock data for last 24 hours
    const now = new Date();
    return Array.from({ length: 24 }, (_, i) => {
      const hour = new Date(now.getTime() - (23 - i) * 60 * 60 * 1000);
      return {
        time: hour.getHours().toString().padStart(2, '0') + ':00',
        messages: Math.floor(Math.random() * 30) + 5,
      };
    });
  }, [data]);

  return (
    <div className="h-[200px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorMessages" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(235, 86%, 65%)" stopOpacity={0.4} />
              <stop offset="95%" stopColor="hsl(235, 86%, 65%)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="time"
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'hsl(215, 20%, 65%)', fontSize: 10 }}
            interval="preserveStartEnd"
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'hsl(215, 20%, 65%)', fontSize: 10 }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(222, 47%, 14%)',
              border: '1px solid hsl(222, 47%, 22%)',
              borderRadius: '8px',
              color: 'hsl(210, 40%, 98%)',
            }}
            labelStyle={{ color: 'hsl(215, 20%, 65%)' }}
          />
          <Area
            type="monotone"
            dataKey="messages"
            stroke="hsl(235, 86%, 65%)"
            strokeWidth={2}
            fill="url(#colorMessages)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
