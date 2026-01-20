import { Card } from "@/components/ui/card";
import { useMemo } from 'react';
import { HighchartsWrapper } from './HighchartsWrapper';
import { ZERRA_COLORS, formatCurrency, createGradient } from '@/lib/highcharts-theme';
import Highcharts from '@/lib/highcharts-init';

interface ChartVisualizationProps {
  type: 'bar' | 'line' | 'pie' | 'area' | 'composed';
  config: {
    title: string;
    xAxis?: string;
    yAxis?: string;
    dataKey: string;
    secondaryDataKey?: string;
  };
  data: Record<string, any>[];
  insight?: string;
}


export function ChartVisualization({ type, config, data, insight }: ChartVisualizationProps) {
  // Validate data and config
  if (!data || data.length === 0) {
    return (
      <Card className="p-6">
        <p className="text-muted-foreground">No data available for this chart</p>
      </Card>
    );
  }

  // Check if required keys exist in data
  const sampleRow = data[0];
  const missingKeys: string[] = [];
  
  if (config.dataKey && !(config.dataKey in sampleRow)) {
    missingKeys.push(config.dataKey);
  }
  if (config.xAxis && !(config.xAxis in sampleRow)) {
    missingKeys.push(config.xAxis);
  }
  if (config.secondaryDataKey && !(config.secondaryDataKey in sampleRow)) {
    missingKeys.push(config.secondaryDataKey);
  }

  if (missingKeys.length > 0) {
    console.warn(`⚠️ Chart "${config.title}" missing data keys:`, missingKeys);
    return (
      <Card className="p-6">
        <h3 className="text-lg font-bold mb-2">{config.title}</h3>
        <p className="text-muted-foreground text-sm">
          Chart configuration error: Missing data columns ({missingKeys.join(', ')})
        </p>
      </Card>
    );
  }


  // Prepare chart options based on type
  const chartOptions = useMemo(() => {
    const baseOptions: Highcharts.Options = {
      chart: {
        type: type === 'composed' ? 'column' : type,
        height: 400,
        spacing: [20, 20, 20, 20],
      },
      title: {
        text: config.title,
        align: 'left',
        margin: 20,
      },
      accessibility: {
        enabled: true,
      },
      exporting: {
        enabled: true,
        buttons: {
          contextButton: {
            menuItems: ['downloadPNG', 'downloadJPEG', 'downloadPDF', 'downloadSVG', 'downloadCSV'],
          },
        },
      },
    };

    switch (type) {
      case 'bar':
        return {
          ...baseOptions,
          chart: {
            ...baseOptions.chart,
            type: 'column',
          },
          xAxis: {
            categories: data.map((row) => String(row[config.xAxis || ''] || '')),
            crosshair: true,
          },
          yAxis: {
            title: {
              text: config.yAxis || '',
            },
          },
          tooltip: {
            formatter: function (this: Highcharts.TooltipFormatterContextObject) {
              const value = this.y as number;
              return `<b>${this.x}</b><br/>${config.dataKey}: ${formatCurrency(value)}`;
            },
          },
          plotOptions: {
            column: {
              borderRadius: 8,
              borderWidth: 0,
              color: createGradient('#00D4FF', '#6B46C1'),
              dataLabels: {
                enabled: false,
              },
            },
          },
          series: [
            {
              name: config.dataKey,
              type: 'column',
              data: data.map((row) => Number(row[config.dataKey]) || 0),
              color: ZERRA_COLORS[0],
            },
          ],
        } as Highcharts.Options;

      case 'line':
        return {
          ...baseOptions,
          chart: {
            ...baseOptions.chart,
            type: 'line',
          },
          xAxis: {
            categories: data.map((row) => String(row[config.xAxis || ''] || '')),
            crosshair: true,
          },
          yAxis: {
            title: {
              text: config.yAxis || '',
            },
          },
          tooltip: {
            formatter: function (this: Highcharts.TooltipFormatterContextObject) {
              const value = this.y as number;
              return `<b>${this.x}</b><br/>${config.dataKey}: ${formatCurrency(value)}`;
            },
          },
          plotOptions: {
            line: {
              marker: {
                radius: 4,
                fillColor: '#00D4FF',
                lineWidth: 2,
                lineColor: '#FFFFFF',
              },
              lineWidth: 3,
            },
          },
          series: [
            {
              name: config.dataKey,
              type: 'line',
              data: data.map((row) => Number(row[config.dataKey]) || 0),
              color: ZERRA_COLORS[0],
            },
          ],
        } as Highcharts.Options;

      case 'area':
        return {
          ...baseOptions,
          chart: {
            ...baseOptions.chart,
            type: 'area',
          },
          xAxis: {
            categories: data.map((row) => String(row[config.xAxis || ''] || '')),
            crosshair: true,
          },
          yAxis: {
            title: {
              text: config.yAxis || '',
            },
          },
          tooltip: {
            formatter: function (this: Highcharts.TooltipFormatterContextObject) {
              const value = this.y as number;
              return `<b>${this.x}</b><br/>${config.dataKey}: ${formatCurrency(value)}`;
            },
          },
          plotOptions: {
            area: {
              fillOpacity: 0.6,
              marker: {
                radius: 4,
              },
              lineWidth: 3,
            },
          },
          series: [
            {
              name: config.dataKey,
              type: 'area',
              data: data.map((row) => Number(row[config.dataKey]) || 0),
              color: createGradient('#00D4FF', 'rgba(0, 212, 255, 0.1)'),
            },
          ],
        } as Highcharts.Options;

      case 'pie':
        const pieData = data.slice(0, 8).map((row) => ({
          name: String(row[config.xAxis || ''] || ''),
          y: Number(row[config.dataKey]) || 0,
        }));
        
        return {
          ...baseOptions,
          chart: {
            ...baseOptions.chart,
            type: 'pie',
          },
          tooltip: {
            formatter: function (this: Highcharts.TooltipFormatterContextObject) {
              return `<b>${this.point.name}</b><br/>${formatCurrency(this.y as number)}<br/>${this.percentage.toFixed(1)}%`;
            },
          },
          plotOptions: {
            pie: {
              allowPointSelect: true,
              cursor: 'pointer',
              dataLabels: {
                enabled: true,
                format: '{point.percentage:.1f}%',
                distance: -30,
                style: {
                  fontWeight: '600',
                  color: '#FFFFFF',
                  textOutline: '1px contrast',
                },
              },
              showInLegend: true,
              innerSize: '40%',
              borderWidth: 2,
            },
          },
          series: [
            {
              name: config.dataKey,
              type: 'pie',
              data: pieData,
              colors: ZERRA_COLORS,
            },
          ],
        } as Highcharts.Options;

      case 'composed':
        return {
          ...baseOptions,
          chart: {
            ...baseOptions.chart,
            type: 'column',
          },
          xAxis: {
            categories: data.map((row) => String(row[config.xAxis || ''] || '')),
            crosshair: true,
          },
          yAxis: [
            {
              title: {
                text: config.yAxis || '',
              },
            },
            {
              title: {
                text: config.secondaryDataKey || '',
              },
              opposite: true,
            },
          ],
          tooltip: {
            shared: true,
            formatter: function (this: Highcharts.TooltipFormatterContextObject) {
              let tooltip = `<b>${this.x}</b><br/>`;
              this.points?.forEach((point) => {
                tooltip += `${point.series.name}: ${formatCurrency(point.y as number)}<br/>`;
              });
              return tooltip;
            },
          },
          plotOptions: {
            column: {
              borderRadius: 8,
              borderWidth: 0,
            },
            line: {
              marker: {
                radius: 4,
              },
              lineWidth: 3,
            },
          },
          series: [
            {
              name: config.dataKey,
              type: 'column',
              data: data.map((row) => Number(row[config.dataKey]) || 0),
              color: ZERRA_COLORS[0],
              yAxis: 0,
            },
            ...(config.secondaryDataKey
              ? [
                  {
                    name: config.secondaryDataKey,
                    type: 'line',
                    data: data.map((row) => Number(row[config.secondaryDataKey!]) || 0),
                    color: ZERRA_COLORS[1],
                    yAxis: 1,
                  } as Highcharts.SeriesOptionsType,
                ]
              : []),
          ],
        } as Highcharts.Options;

      default:
        return baseOptions;
    }
  }, [type, config, data, theme]);

  return (
    <Card className="p-6 bg-gradient-to-br from-card/95 via-card to-primary/5 backdrop-blur-sm border-primary/20 hover:border-primary/40 transition-all duration-300 hover:shadow-xl hover:shadow-primary/10 animate-fade-in group">
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-lg font-bold bg-gradient-to-r from-primary via-primary-light to-accent bg-clip-text text-transparent group-hover:from-accent group-hover:to-primary transition-all duration-500">
          {config.title}
        </h3>
      </div>
      <div className="relative">
        <HighchartsWrapper
          options={chartOptions}
          containerProps={{ style: { width: '100%', height: '400px' } }}
        />
      </div>
      {insight && (
        <div className="mt-6 p-4 rounded-lg bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 border border-primary/20 backdrop-blur-sm">
          <p className="text-sm text-foreground/90 leading-relaxed flex items-start gap-2">
            <span className="text-xl">💡</span>
            <span className="flex-1">{insight}</span>
          </p>
        </div>
      )}
    </Card>
  );
}
