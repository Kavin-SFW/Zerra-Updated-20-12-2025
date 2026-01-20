import React, { useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import { EChartsOption } from 'echarts';
import * as echarts from 'echarts';
import { macaronsTheme } from '@/lib/echarts-theme-macarons';

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
  // Register the Macarons theme
  useEffect(() => {
    echarts.registerTheme('macarons', macaronsTheme);
  }, []);

  // Merge user option with theme defaults
  const themedOption: EChartsOption = {
    ...option,
    backgroundColor: option.backgroundColor || 'transparent',
  };

  return (
    <ReactECharts
      id={id}
      option={themedOption}
      theme="macarons"
      style={style}
      className={className}
      notMerge={true}
      lazyUpdate={true}
      opts={{ renderer: 'canvas' }}
    />
  );
};

export default EChartsWrapper;
