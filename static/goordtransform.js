/**
 * 坐标系转换工具类
 * 支持：WGS84 ↔ GCJ02、GCJ02 ↔ BD09
 */
const CoordTransform = {
  // 圆周率
  PI: Math.PI,
  // 地球半长轴（米）
  a: 6378245.0,
  // 扁率
  ee: 0.00669342162296594323,

  /**
   * 判断是否在国内，不在国内则不做偏移
   * @param {number} lng - 经度
   * @param {number} lat - 纬度
   * @returns {boolean}
   */
  outOfChina(lng, lat) {
    return (
      lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271 || false
    );
  },

  /**
   * 弧度转角度
   * @param {number} rad - 弧度
   * @returns {number}
   */
  rad(rad) {
    return (rad * this.PI) / 180.0;
  },

  /**
   * WGS84转GCJ02（火星坐标系）
   * @param {number} wgLng - WGS84经度
   * @param {number} wgLat - WGS84纬度
   * @returns {[number, number]} [GCJ02经度, GCJ02纬度]
   */
  wgs84ToGcj02(wgLng, wgLat) {
    if (this.outOfChina(wgLng, wgLat)) {
      return [wgLng, wgLat];
    }

    let dLat = this.transformLat(wgLng - 105.0, wgLat - 35.0);
    let dLng = this.transformLng(wgLng - 105.0, wgLat - 35.0);
    const radLat = (wgLat / 180.0) * this.PI;
    let magic = Math.sin(radLat);
    magic = 1 - this.ee * magic * magic;
    const sqrtMagic = Math.sqrt(magic);
    dLat =
      (dLat * 180.0) /
      (((this.a * (1 - this.ee)) / (magic * sqrtMagic)) * this.PI);
    dLng = (dLng * 180.0) / ((this.a / sqrtMagic) * Math.cos(radLat) * this.PI);
    const mgLat = wgLat + dLat;
    const mgLng = wgLng + dLng;
    return [mgLng, mgLat];
  },

  /**
   * GCJ02转WGS84
   * @param {number} gcjLng - GCJ02经度
   * @param {number} gcjLat - GCJ02纬度
   * @returns {[number, number]} [WGS84经度, WGS84纬度]
   */
  gcj02ToWgs84(gcjLng, gcjLat) {
    if (this.outOfChina(gcjLng, gcjLat)) {
      return [gcjLng, gcjLat];
    }

    let dLat = this.transformLat(gcjLng - 105.0, gcjLat - 35.0);
    let dLng = this.transformLng(gcjLng - 105.0, gcjLat - 35.0);
    const radLat = (gcjLat / 180.0) * this.PI;
    let magic = Math.sin(radLat);
    magic = 1 - this.ee * magic * magic;
    const sqrtMagic = Math.sqrt(magic);
    dLat =
      (dLat * 180.0) /
      (((this.a * (1 - this.ee)) / (magic * sqrtMagic)) * this.PI);
    dLng = (dLng * 180.0) / ((this.a / sqrtMagic) * Math.cos(radLat) * this.PI);
    const mgLat = gcjLat + dLat;
    const mgLng = gcjLng + dLng;
    return [gcjLng * 2 - mgLng, gcjLat * 2 - mgLat];
  },

  /**
   * GCJ02转BD09（百度坐标系）
   * @param {number} gcjLng - GCJ02经度
   * @param {number} gcjLat - GCJ02纬度
   * @returns {[number, number]} [BD09经度, BD09纬度]
   */
  gcj02ToBd09(gcjLng, gcjLat) {
    const z =
      Math.sqrt(gcjLng * gcjLng + gcjLat * gcjLat) +
      0.00002 * Math.sin((gcjLat * this.PI * 3000.0) / 180.0);
    const theta =
      Math.atan2(gcjLat, gcjLng) +
      0.000003 * Math.cos((gcjLng * this.PI * 3000.0) / 180.0);
    const bdLng = z * Math.cos(theta) + 0.0065;
    const bdLat = z * Math.sin(theta) + 0.006;
    return [bdLng, bdLat];
  },

  /**
   * BD09转GCJ02
   * @param {number} bdLng - BD09经度
   * @param {number} bdLat - BD09纬度
   * @returns {[number, number]} [GCJ02经度, GCJ02纬度]
   */
  bd09ToGcj02(bdLng, bdLat) {
    const x = bdLng - 0.0065;
    const y = bdLat - 0.006;
    const z =
      Math.sqrt(x * x + y * y) -
      0.00002 * Math.sin((y * this.PI * 3000.0) / 180.0);
    const theta =
      Math.atan2(y, x) - 0.000003 * Math.cos((x * this.PI * 3000.0) / 180.0);
    const gcjLng = z * Math.cos(theta);
    const gcjLat = z * Math.sin(theta);
    return [gcjLng, gcjLat];
  },

  /**
   * BD09转WGS84
   * @param {number} bdLng - BD09经度
   * @param {number} bdLat - BD09纬度
   * @returns {[number, number]} [WGS84经度, WGS84纬度]
   */
  bd09ToWgs84(bdLng, bdLat) {
    const [gcjLng, gcjLat] = this.bd09ToGcj02(bdLng, bdLat);
    return this.gcj02ToWgs84(gcjLng, gcjLat);
  },

  /**
   * WGS84转BD09
   * @param {number} wgLng - WGS84经度
   * @param {number} wgLat - WGS84纬度
   * @returns {[number, number]} [BD09经度, BD09纬度]
   */
  wgs84ToBd09(wgLng, wgLat) {
    const [gcjLng, gcjLat] = this.wgs84ToGcj02(wgLng, wgLat);
    return this.gcj02ToBd09(gcjLng, gcjLat);
  },

  /**
   * 纬度偏移计算
   * @param {number} x - 经度偏移
   * @param {number} y - 纬度偏移
   * @returns {number}
   */
  transformLat(x, y) {
    let ret =
      -100.0 +
      2.0 * x +
      3.0 * y +
      0.2 * y * y +
      0.1 * x * y +
      0.2 * Math.sqrt(Math.abs(x));
    ret +=
      ((20.0 * Math.sin(6.0 * x * this.PI) +
        20.0 * Math.sin(2.0 * x * this.PI)) *
        2.0) /
      3.0;
    ret +=
      ((20.0 * Math.sin(y * this.PI) + 40.0 * Math.sin((y / 3.0) * this.PI)) *
        2.0) /
      3.0;
    ret +=
      ((160.0 * Math.sin((y / 12.0) * this.PI) +
        320 * Math.sin((y * this.PI) / 30.0)) *
        2.0) /
      3.0;
    return ret;
  },

  /**
   * 经度偏移计算
   * @param {number} x - 经度偏移
   * @param {number} y - 纬度偏移
   * @returns {number}
   */
  transformLng(x, y) {
    let ret =
      300.0 +
      x +
      2.0 * y +
      0.1 * x * x +
      0.1 * x * y +
      0.1 * Math.sqrt(Math.abs(x));
    ret +=
      ((20.0 * Math.sin(6.0 * x * this.PI) +
        20.0 * Math.sin(2.0 * x * this.PI)) *
        2.0) /
      3.0;
    ret +=
      ((20.0 * Math.sin(x * this.PI) + 40.0 * Math.sin((x / 3.0) * this.PI)) *
        2.0) /
      3.0;
    ret +=
      ((150.0 * Math.sin((x / 12.0) * this.PI) +
        300.0 * Math.sin((x / 30.0) * this.PI)) *
        2.0) /
      3.0;
    return ret;
  },
};
