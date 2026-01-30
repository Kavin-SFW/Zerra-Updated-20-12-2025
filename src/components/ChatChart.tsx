import React from 'react';
import { EChartsOption } from 'echarts';
import EChartsWrapper from './charts/EChartsWrapper';

interface ChatChartProps {
    option: EChartsOption;
    title?: string;
    type?: 'bar' | 'line' | 'pie' | 'funnel';
}

const ChatChart: React.FC<ChatChartProps> = ({ option, title, type }) => {
    // Customize option for small chat view if needed
    const chatOption: EChartsOption = {
        ...option,
        grid: {
            top: 40,
            bottom: 30,
            left: 10,
            right: 10,
            containLabel: true
        },
        legend: {
            show: true,
            top: 0,
            type: 'scroll',
            pageTextStyle: { color: '#fff' },
            textStyle: { color: '#e2e8f0' }
        },
        // Override backgroundColor to match chat bubble or transparent
        backgroundColor: 'transparent',
    };

    // If textual color in regular chart is dark, we might need to invert it for dark mode chat bubble
    // However, chart-utils sets specific colors. Let's force text color to white/light for chat
    if (chatOption.textStyle) {
        chatOption.textStyle.color = '#e2e8f0'; // slate-200
    } else {
        chatOption.textStyle = { color: '#e2e8f0' };
    }

    if (chatOption.xAxis && !Array.isArray(chatOption.xAxis)) {
        chatOption.xAxis = { ...chatOption.xAxis, axisLabel: { ...(chatOption.xAxis as any).axisLabel, color: '#94a3b8' } };
    }
    if (chatOption.yAxis && !Array.isArray(chatOption.yAxis)) {
        chatOption.yAxis = { ...chatOption.yAxis, axisLabel: { ...(chatOption.yAxis as any).axisLabel, color: '#94a3b8' } };
    }

    return (
        <div className="w-full mt-2 rounded-lg overflow-hidden bg-black/20 border border-white/10 p-2">
            {title && (
                <div className="text-xs font-semibold text-white/80 mb-2 px-1">
                    {title}
                </div>
            )}
            <EChartsWrapper
                option={chatOption}
                style={{ height: '250px', width: '100%' }}
            />
        </div>
    );
};

export default ChatChart;
