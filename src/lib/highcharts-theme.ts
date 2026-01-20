/**
 * Premium Highcharts Theme Configuration for SFW ZERRA
 * Based on the ZERRA design system with midnight blue and electric blue accents
 */

import Highcharts from 'highcharts';

// ZERRA Premium Color Palette
export const ZERRA_COLORS = [
  '#00D4FF', // Electric blue - Primary
  '#6B46C1', // Purple - Secondary
  '#9333EA', // Deep purple - Accent
  '#00A8CC', // Cyan
  '#C026D3', // Magenta
  '#06b6d4', // Teal
  '#f59e0b', // Amber
  '#10b981', // Emerald
];

/**
 * Get premium theme based on current color scheme
 */
export const getZerraTheme = (): Highcharts.Options => {
  const isDark = document.documentElement.classList.contains('dark') || 
                 window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  const backgroundColor = isDark ? '#0A0E27' : '#FAFAFA';
  const textColor = isDark ? '#E5E7EB' : '#0A0E27';
  const mutedColor = isDark ? '#9CA3AF' : '#6B7280';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
  const borderColor = isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)';

  return {
    colors: ZERRA_COLORS,
    chart: {
      backgroundColor,
      borderRadius: 12,
      borderWidth: 0,
      plotBackgroundColor: 'transparent',
      plotBorderWidth: 0,
      plotShadow: false,
      style: {
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif",
      },
      spacing: [20, 20, 20, 20],
    },
    title: {
      style: {
        color: textColor,
        fontSize: '18px',
        fontWeight: '700',
        fontFamily: "'Inter', sans-serif",
        letterSpacing: '-0.02em',
      },
      align: 'left',
      margin: 20,
    },
    subtitle: {
      style: {
        color: mutedColor,
        fontSize: '14px',
      },
    },
    xAxis: {
      gridLineColor: gridColor,
      gridLineWidth: 1,
      lineColor: borderColor,
      lineWidth: 1,
      tickColor: borderColor,
      tickWidth: 1,
      labels: {
        style: {
          color: mutedColor,
          fontSize: '11px',
          fontWeight: '500',
        },
      },
      title: {
        style: {
          color: textColor,
          fontSize: '12px',
          fontWeight: '600',
        },
      },
    },
    yAxis: {
      gridLineColor: gridColor,
      gridLineWidth: 1,
      lineColor: borderColor,
      lineWidth: 1,
      tickColor: borderColor,
      tickWidth: 1,
      labels: {
        style: {
          color: mutedColor,
          fontSize: '11px',
          fontWeight: '500',
        },
      },
      title: {
        style: {
          color: textColor,
          fontSize: '12px',
          fontWeight: '600',
        },
      },
    },
    legend: {
      backgroundColor: 'transparent',
      itemStyle: {
        color: textColor,
        fontSize: '12px',
        fontWeight: '500',
      },
      itemHoverStyle: {
        color: '#00D4FF',
      },
      itemHiddenStyle: {
        color: mutedColor,
        opacity: 0.5,
      },
    },
    tooltip: {
      backgroundColor: isDark ? 'rgba(26, 31, 58, 0.95)' : 'rgba(255, 255, 255, 0.95)',
      borderColor: '#00D4FF',
      borderRadius: 12,
      borderWidth: 1,
      shadow: {
        color: 'rgba(0, 212, 255, 0.3)',
        offsetX: 0,
        offsetY: 4,
        opacity: 0.5,
        width: 10,
      },
      style: {
        color: textColor,
        fontSize: '12px',
        fontWeight: '500',
      },
      padding: 12,
    },
    plotOptions: {
      series: {
        animation: {
          duration: 800,
          easing: 'easeOutCubic',
        },
        dataLabels: {
          style: {
            color: textColor,
            fontSize: '11px',
            fontWeight: '600',
            textOutline: 'none',
          },
        },
        marker: {
          lineWidth: 2,
          lineColor: backgroundColor,
        },
      },
      column: {
        borderRadius: 8,
        borderWidth: 0,
        pointPadding: 0.1,
        groupPadding: 0.15,
      },
      bar: {
        borderRadius: 8,
        borderWidth: 0,
        pointPadding: 0.1,
        groupPadding: 0.15,
      },
      line: {
        lineWidth: 3,
        marker: {
          radius: 4,
          lineWidth: 2,
        },
      },
      area: {
        fillOpacity: 0.6,
        lineWidth: 3,
        marker: {
          radius: 4,
          lineWidth: 2,
        },
      },
      pie: {
        allowPointSelect: true,
        cursor: 'pointer',
        dataLabels: {
          enabled: true,
          distance: -30,
          style: {
            fontWeight: '600',
            color: '#FFFFFF',
            textOutline: '1px contrast',
          },
        },
        borderWidth: 2,
        borderColor: backgroundColor,
      },
    },
    credits: {
      enabled: false,
    },
    accessibility: {
      enabled: true,
      description: 'Chart visualization for SFW ZERRA analytics platform',
    },
    exporting: {
      enabled: true,
      buttons: {
        contextButton: {
          menuItems: [
            'downloadPNG',
            'downloadJPEG',
            'downloadPDF',
            'downloadSVG',
            'downloadCSV',
            'separator',
            'viewData',
          ],
          symbol: 'menu',
          symbolStroke: textColor,
          symbolFill: textColor,
          symbolStrokeWidth: 2,
        },
      },
    },
  };
};

/**
 * Apply ZERRA theme to Highcharts globally
 */
export const applyZerraTheme = () => {
  Highcharts.setOptions(getZerraTheme());
};

/**
 * Format currency values for tooltips
 */
export const formatCurrency = (value: number, currency: string = '₹'): string => {
  return `${currency}${value.toLocaleString('en-IN', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  })}`;
};

/**
 * Format percentage values
 */
export const formatPercentage = (value: number, decimals: number = 1): string => {
  return `${value.toFixed(decimals)}%`;
};

/**
 * Create gradient color for series
 */
export const createGradient = (
  color1: string = '#00D4FF',
  color2: string = '#6B46C1',
  direction: 'vertical' | 'horizontal' = 'vertical'
): Highcharts.GradientColorObject => {
  return {
    linearGradient: direction === 'vertical' 
      ? { x1: 0, y1: 0, x2: 0, y2: 1 }
      : { x1: 0, y1: 0, x2: 1, y2: 0 },
    stops: [
      [0, color1],
      [1, color2],
    ],
  };
};

/**
 * Create glow effect for series
 */
export const createGlowEffect = (color: string = '#00D4FF'): Highcharts.SVGAttributes => {
  return {
    filter: {
      tagName: 'filter',
      id: `glow-${color.replace('#', '')}`,
      children: [
        {
          tagName: 'feGaussianBlur',
          stdDeviation: 3,
          result: 'coloredBlur',
        },
        {
          tagName: 'feMerge',
          children: [
            { tagName: 'feMergeNode', in: 'coloredBlur' },
            { tagName: 'feMergeNode', in: 'SourceGraphic' },
          ],
        },
      ],
    },
  };
};

