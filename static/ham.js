/**
 * Canvas FFT 频率图 + 瀑布图封装函数（两者均按能量显示不同颜色）
 * @param {string} canvasId - Canvas 元素ID
 * @param {Array<number>} fftData - FFT处理后的频率幅值数据（建议0-255范围）
 * @param {Object} [options] - 可选配置项
 * @param {number} [options.maxCache=200] - 瀑布图历史缓存最大长度
 */
function renderFFTVisualization(canvasId, fftData, options = {}) {
  // 默认配置（移除频率图单一颜色，改为按能量配色）
  const defaultOptions = {
    maxCache: 200,
  };
  const config = { ...defaultOptions, ...options };

  // 获取Canvas及上下文
  const canvas = document.getElementById(canvasId);
  if (!canvas) {
    console.error(`Canvas元素不存在：${canvasId}`);
    return;
  }
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    console.error("无法获取Canvas 2D上下文");
    return;
  }

  // 画布参数
  const { width: cWidth, height: cHeight } = canvas;
  const freqHeight = cHeight * 0.7; // 频率图70%高度
  const waterfallHeight = cHeight * 0.3; // 瀑布图30%高度
  const waterfallTop = freqHeight; // 瀑布图顶部Y坐标
  const fftLength = fftData.length;
  const freqStep = cWidth / fftLength; // 频率轴步长
  const barWidth = cWidth / fftLength; // 频率柱宽度

  // 瀑布图历史缓存
  if (!renderFFTVisualization.waterfallHistory) {
    renderFFTVisualization.waterfallHistory = [];
  }
  const history = renderFFTVisualization.waterfallHistory;

  // ---------------------- 公共函数：根据能量值获取颜色 ----------------------
  // 提取颜色逻辑为公共函数，频率图和瀑布图共用，保证配色一致性
  function getColorByEnergy(energyValue) {
    // 归一化能量值（0=最低，1=最高）
    const normEnergy = Math.min(energyValue / 255, 1);
    let color;
    if (normEnergy < 0.2) {
      // 低能量：深蓝→浅蓝
      const blue = 255;
      const green = Math.floor(normEnergy * 5 * 255);
      color = `rgb(0, ${green}, ${blue})`;
    } else if (normEnergy < 0.5) {
      // 中低能量：浅蓝→纯绿
      const green = 255;
      const blue = Math.floor((0.5 - normEnergy) * 2 * 255);
      color = `rgb(0, ${green}, ${blue})`;
    } else if (normEnergy < 0.8) {
      // 中高能量：纯绿→纯黄
      const red = Math.floor(((normEnergy - 0.5) / 0.3) * 255);
      const green = 255;
      color = `rgb(${red}, ${green}, 0)`;
    } else {
      // 高能量：纯黄→纯红
      const red = 255;
      const green = Math.floor((1 - normEnergy) * 5 * 255);
      color = `rgb(${red}, ${green}, 0)`;
    }
    return color;
  }

  // ---------------------- 绘制频率图（按能量显示不同颜色） ----------------------
  function drawFreqChart() {
    // 清空频率图区域
    ctx.clearRect(0, 0, cWidth, freqHeight);

    for (let i = 0; i < fftLength; i++) {
      const energyValue = fftData[i];
      const normValue = Math.min(energyValue / 255, 1);
      const barHeight = normValue * freqHeight;
      const x = i * barWidth;
      const y = freqHeight - barHeight; // 从底部向上绘制

      // 核心：根据当前频率柱的能量获取对应颜色
      const barColor = getColorByEnergy(energyValue);
      ctx.fillStyle = barColor;
      ctx.fillRect(x, y, barWidth - 1, barHeight); // 绘制彩色频率柱
    }

    // 频率图标题 + 颜色说明
    // ctx.fillStyle = "#fff";
    // ctx.font = "16px Arial";
    // ctx.fillText("实时频率图（按能量配色：蓝→绿→黄→红）", 10, 20);
  }

  // ---------------------- 绘制瀑布图（按能量显示不同颜色） ----------------------
  function drawWaterfallChart() {
    // 清空瀑布图区域
    ctx.clearRect(0, waterfallTop, cWidth, waterfallHeight);

    // 缓存逻辑：垂直从上到下滚动
    history.unshift([...fftData]);
    if (history.length > waterfallHeight) {
      history.pop();
    }

    // 遍历历史帧绘制
    for (let timeIdx = 0; timeIdx < history.length; timeIdx++) {
      const historyFFT = history[timeIdx];
      const y = waterfallTop + timeIdx; // 时间轴（Y轴）

      for (let freqIdx = 0; freqIdx < fftLength; freqIdx++) {
        const energyValue = historyFFT[freqIdx];
        // 复用公共颜色函数，保证与频率图配色一致
        const pixelColor = getColorByEnergy(energyValue);
        const x = freqIdx * freqStep;

        ctx.fillStyle = pixelColor;
        ctx.fillRect(x, y, freqStep, 1);
      }
    }

    // 瀑布图标题 + 颜色图例
    // ctx.fillStyle = "#fff";
    // ctx.font = "16px Arial";
    // ctx.fillText("频谱瀑布图（按能量配色：蓝→绿→黄→红）", 10, waterfallTop + 20);
    // 绘制简易颜色图例
    // const legendX = cWidth - 150;
    // const legendY = waterfallTop + 20;
    // ctx.fillStyle = "rgb(0,0,255)"; ctx.fillRect(legendX, legendY, 20, 10);
    // ctx.fillStyle = "rgb(0,255,0)"; ctx.fillRect(legendX + 25, legendY, 20, 10);
    // ctx.fillStyle = "rgb(255,255,0)"; ctx.fillRect(legendX + 50, legendY, 20, 10);
    // ctx.fillStyle = "rgb(255,0,0)"; ctx.fillRect(legendX + 75, legendY, 20, 10);
    // ctx.font = "12px Arial";
    // ctx.fillText("低能量", legendX, legendY + 25);
    // ctx.fillText("中能量", legendX + 25, legendY + 25);
    // ctx.fillText("中高能量", legendX + 50, legendY + 25);
    // ctx.fillText("高能量", legendX + 75, legendY + 25);
  }

  // 执行绘制
  drawFreqChart();
  drawWaterfallChart();
}

// ------------------- 使用示例 -------------------
function generateMockFFTData(length = 128) {
  const fftData = [];
  for (let i = 0; i < length; i++) {
    // 模拟能量分布：中间频段能量高，两侧低
    const midFreqPeak =
      Math.exp(-Math.pow((i - length / 2) / (length / 4), 2)) * 255;
    const noise = Math.random() * 50; // 增加噪声，让能量变化更明显
    fftData.push(Math.min(midFreqPeak + noise, 255));
  }
  return fftData;
}

// // 实时渲染
// setInterval(() => {
//   const mockFFTData = generateMockFFTData(128);
//   renderFFTVisualization("fftCanvas", mockFFTData);
// }, 50);
