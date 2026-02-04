import React, { useEffect, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { EChartsOption } from 'echarts';
import * as echarts from 'echarts';
import { applyPowerBITheme } from '@/lib/powerbi-chart-theme';

interface EChartsWrapperProps {
  option: EChartsOption;
  style?: React.CSSProperties;
  className?: string;
  id?: string;
}

const EChartsWrapper: React.FC<EChartsWrapperProps> = ({
  option,
  style = { height: '400px', width: '100%' },
  className = '',
  id
}) => {
  // Validate and sanitize chart option for accuracy
  const validatedOption = useMemo(() => {
    if (!option || typeof option !== 'object') {
      console.warn('Invalid chart option provided');
      return { title: { text: 'No data available' } };
    }

    // Ensure series data is valid
    const sanitizedOption = { ...option };
    
    if (sanitizedOption.series) {
      const series = Array.isArray(sanitizedOption.series) 
        ? sanitizedOption.series 
        : [sanitizedOption.series];
      
      sanitizedOption.series = series.map((s: any) => {
        if (s.data && Array.isArray(s.data)) {
          // Filter out invalid data points
          s.data = s.data.map((point: any) => {
            if (Array.isArray(point)) {
              return point.map(p => {
                const num = Number(p);
                return isNaN(num) ? 0 : num;
              });
            }
            const num = Number(point);
            return isNaN(num) ? 0 : num;
          });
        }
        return s;
      });
    }

    // Apply PowerBI theme for professional styling
    return applyPowerBITheme(sanitizedOption);
  }, [option]);

  // Ensure chart resizes properly
  useEffect(() => {
    const handleResize = () => {
      if (id) {
        const chartInstance = echarts.getInstanceByDom(
          document.getElementById(id) as HTMLElement
        );
        chartInstance?.resize();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [id]);

  return (
    <ReactECharts
      id={id}
      option={validatedOption}
      style={style}
      className={className}
      notMerge={false}
      lazyUpdate={false}
      opts={{ 
        renderer: 'canvas',
        devicePixelRatio: window.devicePixelRatio || 2 // High DPI for crisp rendering
      }}
      onChartReady={(chart) => {
        // Ensure chart is properly rendered
        chart.resize();
      }}
    />
  );
};

export default EChartsWrapper;
