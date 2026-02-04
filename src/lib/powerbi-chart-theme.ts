/**
 * PowerBI-Style Chart Theme
 * Professional, polished styling matching PowerBI dashboard quality
 */

import { EChartsOption } from 'echarts';

export const POWERBI_COLORS = [
  '#0078D4', // PowerBI Blue
  '#00B294', // Teal
  '#8764B8', // Purple
  '#FFB900', // Amber
  '#5C2D91', // Dark Purple
  '#E81123', // Red
  '#107C10', // Green
  '#FF8C00', // Orange
  '#00188F', // Navy
  '#EA005E', // Pink
];

export const POWERBI_GRADIENT_COLORS = [
  ['#0078D4', '#005A9E'],
  ['#00B294', '#008A75'],
  ['#8764B8', '#6B4C9F'],
  ['#FFB900', '#CC9400'],
  ['#5C2D91', '#4A2473'],
];

export const POWERBI_CHART_THEME: Partial<EChartsOption> = {
  backgroundColor: 'transparent',
  textStyle: {
    fontFamily: 'Segoe UI, -apple-system, BlinkMacSystemFont, Roboto, sans-serif',
    fontSize: 12,
    color: '#323130',
    fontWeight: 'normal'
  },
  color: POWERBI_COLORS,
  grid: {
    left: '60px',
    right: '20px',
    top: '50px',
    bottom: '50px',
    containLabel: true,
    borderColor: 'transparent'
  },
  tooltip: {
    trigger: 'axis',
    backgroundColor: '#FFFFFF',
    borderColor: '#E1DFDD',
    borderWidth: 1,
    textStyle: {
      color: '#323130',
      fontSize: 12,
      fontFamily: 'Segoe UI, sans-serif'
    },
    padding: [8, 12],
    extraCssText: 'box-shadow: 0 2px 8px rgba(0,0,0,0.15); border-radius: 4px;',
    axisPointer: {
      type: 'line',
      lineStyle: {
        color: '#0078D4',
        width: 1,
        type: 'solid'
      },
      label: {
        backgroundColor: '#0078D4',
        borderColor: '#0078D4',
        color: '#FFFFFF',
        fontSize: 11
      }
    },
    formatter: (params: any) => {
      if (!Array.isArray(params)) params = [params];
      let result = `<div style="font-weight: 600; margin-bottom: 4px;">${params[0].axisValue}</div>`;
      params.forEach((param: any) => {
        const value = typeof param.value === 'number' 
          ? param.value.toLocaleString('en-US', { maximumFractionDigits: 2 })
          : param.value;
        const color = param.color || '#0078D4';
        result += `<div style="margin: 2px 0;">
          <span style="display: inline-block; width: 10px; height: 10px; background: ${color}; border-radius: 2px; margin-right: 6px;"></span>
          <span style="font-weight: 500;">${param.seriesName}:</span> 
          <span style="margin-left: 8px; color: #605E5C;">${value}</span>
        </div>`;
      });
      return result;
    }
  },
  legend: {
    show: true,
    type: 'scroll',
    orient: 'horizontal',
    left: 'center',
    top: 'top',
    itemGap: 20,
    itemWidth: 14,
    itemHeight: 14,
    textStyle: {
      color: '#323130',
      fontSize: 12,
      fontFamily: 'Segoe UI, sans-serif'
    },
    icon: 'rect',
    borderColor: 'transparent'
  },
  xAxis: {
    type: 'category',
    axisLine: {
      show: true,
      lineStyle: {
        color: '#E1DFDD',
        width: 1
      }
    },
    axisTick: {
      show: false
    },
    axisLabel: {
      color: '#605E5C',
      fontSize: 11,
      fontFamily: 'Segoe UI, sans-serif',
      margin: 12,
      rotate: 0
    },
    splitLine: {
      show: false
    }
  },
  yAxis: {
    type: 'value',
    axisLine: {
      show: false
    },
    axisTick: {
      show: false
    },
    axisLabel: {
      color: '#605E5C',
      fontSize: 11,
      fontFamily: 'Segoe UI, sans-serif',
      margin: 8,
      formatter: (value: number) => {
        if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
        if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
        return value.toLocaleString();
      }
    },
    splitLine: {
      show: true,
      lineStyle: {
        color: '#F3F2F1',
        width: 1,
        type: 'solid'
      }
    }
  },
  dataZoom: {
    show: false
  },
  animation: true,
  animationDuration: 750,
  animationEasing: 'cubicOut',
  animationDelay: (idx: number) => idx * 50
};

/**
 * Apply PowerBI theme to chart option
 */
export function applyPowerBITheme(option: EChartsOption): EChartsOption {
  return {
    ...POWERBI_CHART_THEME,
    ...option,
    tooltip: {
      ...POWERBI_CHART_THEME.tooltip,
      ...(option.tooltip as any)
    },
    grid: {
      ...POWERBI_CHART_THEME.grid,
      ...(option.grid as any)
    },
    xAxis: Array.isArray(option.xAxis) 
      ? option.xAxis.map((ax: any) => ({ ...POWERBI_CHART_THEME.xAxis, ...ax }))
      : { ...POWERBI_CHART_THEME.xAxis, ...(option.xAxis as any) },
    yAxis: Array.isArray(option.yAxis)
      ? option.yAxis.map((ax: any) => ({ ...POWERBI_CHART_THEME.yAxis, ...ax }))
      : { ...POWERBI_CHART_THEME.yAxis, ...(option.yAxis as any) },
    legend: {
      ...POWERBI_CHART_THEME.legend,
      ...(option.legend as any)
    }
  };
}

/**
 * Create PowerBI-style gradient
 */
export function createPowerBIGradient(color1: string, color2: string, direction: 'vertical' | 'horizontal' = 'vertical') {
  if (direction === 'vertical') {
    return {
      type: 'linear' as const,
      x: 0,
      y: 0,
      x2: 0,
      y2: 1,
      colorStops: [
        { offset: 0, color: color1 },
        { offset: 1, color: color2 }
      ]
    };
  } else {
    return {
      type: 'linear' as const,
      x: 0,
      y: 0,
      x2: 1,
      y2: 0,
      colorStops: [
        { offset: 0, color: color1 },
        { offset: 1, color: color2 }
      ]
    };
  }
}

/**
 * Format numbers in PowerBI style
 */
export function formatPowerBINumber(value: number, decimals: number = 2): string {
  if (Math.abs(value) >= 1000000000) {
    return `${(value / 1000000000).toFixed(decimals)}B`;
  }
  if (Math.abs(value) >= 1000000) {
    return `${(value / 1000000).toFixed(decimals)}M`;
  }
  if (Math.abs(value) >= 1000) {
    return `${(value / 1000).toFixed(decimals)}K`;
  }
  return value.toFixed(decimals);
}

/**
 * Get PowerBI color by index
 */
export function getPowerBIColor(index: number): string {
  return POWERBI_COLORS[index % POWERBI_COLORS.length];
}
