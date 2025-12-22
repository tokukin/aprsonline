// ===================== 全局变量 =====================
let map = null; // 全局地图实例
let AMap = null; // 全局保存AMap对象
const markerList = []; // 全局标记点列表

// 自动刷新相关全局变量 - 核心修改：默认关闭自动刷新
let autoRefreshTimer = null;
let refreshInterval = 60; // 刷新间隔（秒）
let remainingSeconds = refreshInterval;
let isAutoRefreshEnabled = false; // 初始值改为 false

// ===================== 全局工具函数 =====================
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

function listClickToMap(id) {
  if (!map) return;

  const targetMarker = markerList.find(
    (marker) => marker.getExtData()?.id === id
  );

  if (!targetMarker) {
    console.warn(`未找到ID为${id}的标记点`);
    return;
  }

  map.setZoomAndCenter(7, targetMarker.getPosition());
}

function bindListClick() {
  const listItems = document.querySelectorAll(".list-row[data-id]");

  listItems.forEach((item) => {
    item.removeEventListener("click", item.clickHandler);

    item.clickHandler = () => {
      const id = item.getAttribute("data-id");

      document.querySelectorAll(".list-row").forEach((li) => {
        li.style.backgroundColor = "";
        li.style.borderLeft = "";
      });

      item.style.backgroundColor = "#f0f7ff";
      item.style.borderLeft = "3px solid #6366f1";

      listClickToMap(id);
    };

    item.addEventListener("click", item.clickHandler);
  });
}

function markerClickToList(id) {
  const targetItem = document.querySelector(`.list-row[data-id="${id}"]`);
  if (!targetItem) {
    console.warn(`未找到ID为${id}的列表项`);
    return;
  }

  // 2. 滚动列表项到可视区域（恢复最初正常的滚动逻辑）
  targetItem.scrollIntoView({
    behavior: "smooth", // 平滑滚动
    block: "center", // 居中显示
    inline: "nearest", // 就近对齐
  });

  document.querySelectorAll(".list-row").forEach((li) => {
    li.style.backgroundColor = "";
    li.style.borderLeft = "";
  });

  targetItem.style.backgroundColor = "#c9e0faff";
  targetItem.style.borderLeft = "3px solid #6366f1";
}

// ===================== 自动刷新功能 =====================
function updateCountdown() {
  const countdownEl = document.getElementById("countdown");
  if (!countdownEl) return;

  countdownEl.textContent = remainingSeconds;

  if (remainingSeconds <= 5) {
    countdownEl.classList.add("refresh-loading");
  } else {
    countdownEl.classList.remove("refresh-loading");
  }
}

function startAutoRefresh() {
  if (!isAutoRefreshEnabled || autoRefreshTimer) return;

  autoRefreshTimer = setInterval(() => {
    remainingSeconds--;
    updateCountdown();

    if (remainingSeconds <= 0) {
      autoRefresh();
      remainingSeconds = refreshInterval;
    }
  }, 1000);
}

function stopAutoRefresh() {
  if (autoRefreshTimer) {
    clearInterval(autoRefreshTimer);
    autoRefreshTimer = null;
  }
}

// 核心修改：切换逻辑适配初始关闭状态
function toggleAutoRefresh() {
  isAutoRefreshEnabled = !isAutoRefreshEnabled;
  const toggleBtn = document.getElementById("toggle-auto-refresh");
  const tipEl = document.getElementById("auto-refresh-tip");

  if (!toggleBtn || !tipEl) return;

  if (isAutoRefreshEnabled) {
    // 开启自动刷新
    toggleBtn.textContent = "暂停刷新";
    tipEl.innerHTML = `自动刷新：<span id="countdown">${remainingSeconds}</span>秒后`;
    startAutoRefresh();
  } else {
    // 关闭自动刷新
    toggleBtn.textContent = "恢复刷新";
    tipEl.textContent = "自动刷新：已暂停";
    stopAutoRefresh();
  }
}

function showRefreshSuccessTip() {
  const oldTip = document.querySelector(".refresh-success");
  if (oldTip) oldTip.remove();

  const tip = document.createElement("div");
  tip.className = "refresh-success";
  tip.textContent = "数据已自动刷新！";
  document.body.appendChild(tip);

  setTimeout(() => tip.remove(), 3000);
}

// ===================== 核心业务函数 =====================
function renderTable(data) {
  const button_reload = document.getElementById("reload_fmo_button");
  const tableBody1 = document.getElementById("stationlist_left");
  const tableBody2 = document.getElementById("stationlist_right");

  if (!button_reload || !tableBody1 || !tableBody2) {
    console.error("缺少必要的DOM元素");
    return;
  }

  tableBody1.innerHTML = "";
  tableBody2.innerHTML = "";

  let rowHtml1 = "";
  let rowHtml2 = "";

  if (!data || data.length === 0) {
    rowHtml1 = '<li class="list-row text-center">暂无数据</li>';
    rowHtml2 = '<li class="list-row text-center">暂无数据</li>';
  } else {
    data.forEach((item, i) => {
      const data_item_cst = formatGMTToCST(item.create_time);
      const uniqueId = item.fmo_name || `fmo_${i}`;

      const html_demo = `
        <li class="list-row" data-id="${uniqueId}">
          <div><img class="size-10 rounded-box" src="static/station.svg" /></div>
          <div>
              <div class="fmo-name">${item.fmo_name}</div>
              <div class="text-xs uppercase font-semibold opacity-60 fmo-second">所有者：${item.callsign}</div>
              <div class="text-xs uppercase font-semibold opacity-60  fmo-second">通播时间：${data_item_cst}</div>
          </div>
          <p class="list-col-wrap text-xs fmo-third">
              服务器地址：${item.fmo_ip}|端口:${item.fmo_port}
              <br />
              东经：${item.longitude}|北纬：${item.latitude}
          </p>
        </li>
      `;

      i % 2 === 0 ? (rowHtml1 += html_demo) : (rowHtml2 += html_demo);
    });
  }

  tableBody1.innerHTML = `<li class="p-4 pb-2 text-xs opacity-60 tracking-wide">FMO站点列表</li>${rowHtml1}`;
  tableBody2.innerHTML = `<li class="p-4 pb-2 text-xs opacity-60 tracking-wide">只显示24小时内上线服务器</li>${rowHtml2}`;

  button_reload.innerHTML = "刷新数据";
  button_reload.disabled = false;

  bindListClick();
}

async function renderMap(data_item) {
  await waitMapReady();

  if (!map) {
    console.error("地图实例未初始化");
    return;
  }

  if (markerList.length > 0) {
    map.remove(markerList);
    markerList.length = 0;
  }

  if (!data_item || data_item.length === 0) return;

  data_item.forEach((item) => {
    if (!item.longitude || !item.latitude) return;

    const [gcjLng, gcjLat] = CoordTransform.wgs84ToGcj02(
      parseFloat(item.longitude),
      parseFloat(item.latitude)
    );

    const marker = new AMap.Marker({
      position: [gcjLng, gcjLat],
      title: item.fmo_name,
      label: {
        offset: new AMap.Pixel(0, -30),
        content: `<div class="marker-label">${item.fmo_name}</div>`,
        direction: "top",
      },
      extData: { id: item.fmo_name || `fmo_${markerList.length}` },
    });

    marker.on("click", () => {
      const id = marker.getExtData().id;
      markerClickToList(id);
    });

    markerList.push(marker);
  });

  map.add(markerList);
  map.setFitView(markerList, { padding: [50, 50] });
}

async function reload_fmo_date() {
  const button_reload = document.getElementById("reload_fmo_button");
  if (!button_reload) {
    console.error("未找到刷新按钮");
    return;
  }

  button_reload.innerHTML =
    '<span class="loading loading-spinner"></span> loading ';
  button_reload.disabled = true;

  try {
    const response = await fetch("/api/fmo");
    if (!response.ok) throw new Error(`HTTP错误：${response.status}`);

    const data = await response.json();

    await new Promise((resolve) => setTimeout(resolve, 500));

    renderTable(data.data);
    await renderMap(data.data);

    remainingSeconds = refreshInterval;
    updateCountdown();
  } catch (error) {
    console.error("手动刷新失败：", error);
    alert("数据刷新失败");
  } finally {
    button_reload.innerHTML = "刷新数据";
    button_reload.disabled = false;
  }
}

async function autoRefresh() {
  if (!isAutoRefreshEnabled) return;

  const button_reload = document.getElementById("reload_fmo_button");
  if (!button_reload) return;

  button_reload.innerHTML =
    '<span class="loading loading-spinner"></span> 自动刷新中...';
  button_reload.disabled = true;

  try {
    const response = await fetch("http://127.0.0.1:5000/api/fmo");
    if (!response.ok) throw new Error(`HTTP错误：${response.status}`);

    const data = await response.json();

    renderTable(data.data);
    await renderMap(data.data);

    showRefreshSuccessTip();
  } catch (error) {
    console.error("自动刷新失败：", error);
  } finally {
    button_reload.innerHTML = "刷新数据";
    button_reload.disabled = false;
    updateCountdown();
  }
}

// 核心修改：初始化函数不启动定时器，只设置初始UI
function initAutoRefresh() {
  const toggleBtn = document.getElementById("toggle-auto-refresh");
  const tipEl = document.getElementById("auto-refresh-tip");

  // 设置初始UI状态：暂停+提示文字
  if (toggleBtn) toggleBtn.textContent = "启动自动刷新";
  if (tipEl) tipEl.textContent = "自动刷新：已暂停";

  // 只更新倒计时显示，不启动定时器
  updateCountdown();

  // 绑定按钮事件
  if (toggleBtn) {
    toggleBtn.addEventListener("click", toggleAutoRefresh);
  }
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
        zoom: 9,
        center: [104.0, 36.04],
      });
      console.log("地图初始化完成！");
    })
    .catch((e) => {
      console.error("地图加载失败：", e);
    });

  const reloadBtn = document.getElementById("reload_fmo_button");
  if (reloadBtn) {
    reloadBtn.addEventListener("click", reload_fmo_date);
  }

  reload_fmo_date();
  // 初始化自动刷新UI，不启动定时器
  initAutoRefresh();
});
