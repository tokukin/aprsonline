// ===================== 全局变量 =====================
let map = null; // 全局地图实例
let AMap = null; // 全局保存AMap对象
let labelsLayer = null; // 全局标签层
let icon = null;
const markerList = []; // 全局标记点列表
let aprs_list = [];
const MAP_INIT_CONFIG = {
  center: [104.0, 36.04], // 初始中心点（可根据需求修改）
  zoom: 7, // 初始缩放级别（可根据需求修改）
  viewMode: "2D", // 视图模式
};

function waitMapReady() {
  return new Promise((resolve) => {
    const timer = setInterval(() => {
      if (map) {
        clearInterval(timer);
        resolve();
      }
    }, 100);

    setTimeout(() => {
      clearInterval(timer);
      resolve();
    }, 10000);
  });
}

function formatGMTToCST(gmtDateStr) {
  const date = new Date(gmtDateStr);
  if (isNaN(date.getTime())) return "无效日期";

  const options = {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  };
  return new Intl.DateTimeFormat("zh-CN", options).format(date);
}

async function reload_aprs_date() {
  try {
    const response = await fetch("/api/aprs");
    if (!response.ok) throw new Error(`HTTP错误：${response.status}`);

    const data = await response.json();

    return data;
  } catch (error) {
    console.error("数据加载失败：", error);
    return null;
  } finally {
  }
}

async function renderMap(data_item) {
  await waitMapReady();

  if (!map) {
    console.error("地图实例未初始化");
    return;
  }

  // ===== 补充：完整的清除原有渲染内容 =====
  // 1. 从地图中移除标签层（避免图层重复添加）
  if (labelsLayer) {
    map.remove(labelsLayer);
  }
  // 2. 清空标签层内的所有标记（核心修复：避免旧标记残留）
  if (labelsLayer && labelsLayer.clear) {
    labelsLayer.clear(); // 清空LabelsLayer内的所有标记
  }
  // 3. 清除markerList中的标记并清空数组
  if (markerList.length > 0) {
    map.remove(markerList); // 从地图移除标记
    markerList.length = 0; // 清空数组
  }

  // 无数据时直接返回
  if (!data_item || data_item.length === 0) return;

  data_item.forEach((item) => {
    if (!item.longitude || !item.latitude) return;

    const [gcjLng, gcjLat] = CoordTransform.wgs84ToGcj02(
      parseFloat(item.longitude),
      parseFloat(item.latitude)
    );
    const text = {
      content: item.callsign,
      direction: "right",
      offset: [-5, -2],
      style: {
        fontSize: 15,
        fillColor: "#d34545ff",
        strokeColor: "#fff",
        strokeWidth: 2,
      },
    };

    const labelMarker = new AMap.LabelMarker({
      name: "标注",
      position: [gcjLng, gcjLat],
      zIndex: 16,
      rank: 1,
      icon: icon,
      text: text,
    });

    const create_time = formatGMTToCST(item.create_time);
    labelMarker.on("click", function (e) {
      const infoContent = document.getElementById("aprs-info-content");
      infoContent.innerHTML = `
        <div class="aprs-info-title"><div>APRS Info</div></div>
        <div class="aprs-info-index">
        <div class="aprs-info-key">呼号：</div>
        <div class="aprs-info-callsign"> ${item.callsign}</div>
        </div>
        <div class="aprs-info-index">
        <div class="aprs-info-key">通播时间：</div>
        <div class="aprs-info-create-time">${create_time}</div>
        </div>
        <div class="aprs-info-index">
        <div class="aprs-info-key">位置：</div>
        <div class="aprs-info-location">${item.longitude}, ${item.latitude}</div>
        </div>
        <div class="aprs-info-index-comment">
        <div class="aprs-info-key">备注：</div>
        <div class="aprs-info-comment">${item.comment}</div>
        </div>
      `;
    });
    markerList.push(labelMarker);
  });

  // 重新添加标记到图层，并将图层添加到地图
  labelsLayer.add(markerList);
  map.add(labelsLayer);
}

// 模糊查询呼号并渲染结果
function searchCallsign(keyword, mode) {
  if (!aprs_list || aprs_list.length === 0) {
    alert("暂无APRS数据");
    return;
  }

  // 去除首尾空格，转为小写用于模糊匹配
  const searchKey = keyword.trim().toLowerCase();

  // 模糊匹配逻辑：callsign包含关键词（忽略大小写）
  let filteredData = aprs_list;
  if (searchKey) {
    filteredData = aprs_list.filter((item) => {
      // 确保callsign存在且为字符串
      return item.callsign && item.callsign.toLowerCase().includes(searchKey);
    });
  }
  if (filteredData.length > 0) {
    const firstItem = filteredData[0];
    const [gcjLng, gcjLat] = CoordTransform.wgs84ToGcj02(
      parseFloat(firstItem.longitude),
      parseFloat(firstItem.latitude)
    );
    map.setCenter([gcjLng, gcjLat]); // 定位到第一个匹配点
    map.setZoom(10); // 放大视野
  }
  if (mode === "clear") {
    // 渲染匹配结果（清空原有标记后重新渲染）
    renderMap(filteredData);
  }

  // 提示无匹配结果
  if (filteredData.length === 0 && searchKey) {
    alert(`未找到包含「${keyword}」的呼号`);
  }
}

// 绑定搜索事件
function bindSearchEvent() {
  const searchInput = document.querySelector(
    '#aprs-info-search input[type="search"]'
  );
  const searchBtn1 = document.getElementById("aprs-search-clear-all");
  const searchBtn2 = document.getElementById("aprs-search-no-clear");
  const searchBtn3 = document.getElementById("aprs-search-del");

  // 按钮点击搜索
  searchBtn1.addEventListener("click", () => {
    searchCallsign(searchInput.value, "clear");
  });
  // 按钮点击搜索
  searchBtn2.addEventListener("click", () => {
    searchCallsign(searchInput.value, "no_clear");
  });

  searchBtn3.addEventListener("click", () => {
    renderMap(aprs_list);
    map.setCenter(MAP_INIT_CONFIG.center); // 重置中心点
    map.setZoom(MAP_INIT_CONFIG.zoom); // 重置缩放级别
  });
  // 回车触发搜索
  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      searchCallsign(searchInput.value, "clear");
    }
  });

  // 清空输入框时显示全部数据
  searchInput.addEventListener("input", (e) => {
    if (e.target.value.trim() === "") {
      renderMap(aprs_list);
      map.setCenter(MAP_INIT_CONFIG.center); // 重置中心点
      map.setZoom(MAP_INIT_CONFIG.zoom); // 重置缩放级别
    }
  });
}

// ===================== DOM初始化 =====================
document.addEventListener("DOMContentLoaded", function () {
  window._AMapSecurityConfig = {
    securityJsCode: "dedbaf326a2eb8ed26dea6236884e033",
  };

  AMapLoader.load({
    key: "109d6150a5e09279cf44c48a1a1ad189",
    version: "2.0",
    plugins: ["AMap.Marker"],
  })
    .then((amapInstance) => {
      AMap = amapInstance;
      map = new AMap.Map("map-container", {
        viewMode: "2D",
        zoom: 7,
        center: [104.0, 36.04],
      });

      labelsLayer = new AMap.LabelsLayer({
        zooms: [5, 20],
        zIndex: 1000,
        collision: true, //该层内标注是否避让
        allowCollision: true, //不同标注层之间是否避让
      });

      icon = {
        type: "image", //图标类型，现阶段只支持 image 类型
        image: "./static/aprs_point.png", //可访问的图片 URL
        // size: [64, 30], //图片尺寸
        anchor: "center", //图片相对 position 的锚点，默认为 bottom-center
      };

      console.log("地图初始化完成！");
      bindSearchEvent();
    })
    .catch((e) => {
      console.error("地图加载失败：", e);
    });

  reload_aprs_date().then((data) => {
    if (data) {
      aprs_list = data.data;
      renderMap(aprs_list);
    }
  });
});
