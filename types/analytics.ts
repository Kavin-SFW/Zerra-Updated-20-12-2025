import { EChartsOption } from 'echarts';

export interface VisualizationRecommendation {
    type: string;
    title: string;
    x_axis: string;
    y_axis: string | string[];
    x_label?: string;
    y_label?: string;
    colorPalette?: string[];
    reasoning?: string;
    priority: 'high' | 'medium' | 'low';
}

export interface PrescriptiveInsight {
    type: string;
    title: string;
    description: string;
    recommendation: string;
    priority: 'high' | 'medium' | 'low';
}

export interface ChartInstance {
    title: string;
    option: EChartsOption;
    rec: VisualizationRecommendation;
}
