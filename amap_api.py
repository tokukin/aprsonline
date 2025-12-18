import requests
import json
from typing import Dict, Optional, Tuple, List


class AmapGeocoder:
    """高德地图地理编码 API 封装类"""
    # 地理编码 API 接口地址
    GEOCODE_API_URL = "https://restapi.amap.com/v3/geocode/geo"
    # 逆地理编码 API 接口地址（经纬度转地址，可选）
    REVERSE_GEOCODE_API_URL = "https://restapi.amap.com/v3/geocode/regeo"

    # 坐标转换 API 接口地址
    CONVERT_API_URL = "https://restapi.amap.com/v3/assistant/coordinate/convert"
    
    AMAP_API_KEY = "af52779e3246e2e7b7f9b2448556fe90"

    def __init__(self):
        """
        初始化
        :param api_key: 高德 Web 服务 API Key
        """
        self.api_key = self.AMAP_API_KEY
        self.session = requests.Session()  # 复用会话，提升性能

    def geocode(self, address: str, city: Optional[str] = None) -> Dict:
        """
        地理编码：地址 → 经纬度（GCJ02 坐标系）
        :param address: 详细地址（如：北京市朝阳区建国路88号）
        :param city: 城市（可选，如：北京市，缩小检索范围）
        :return: 解析结果字典，包含经纬度、地址组件等
        """
        params = {
            "key": self.api_key,
            "address": address,
            "output": "JSON",  # 返回格式：JSON/XML
            "city": city or ""
        }

        try:
            response = self.session.get(self.GEOCODE_API_URL, params=params, timeout=10)
            response.raise_for_status()  # 抛出 HTTP 错误
            result = response.json()

            # 解析结果
            if result.get("status") == "1" and len(result.get("geocodes", [])) > 0:
                geocode = result["geocodes"][0]
                return {
                    "success": True,
                    "address": address,
                    "formatted_address": geocode.get("formatted_address"),  # 格式化地址
                    "province": geocode.get("province"),  # 省
                    "city": geocode.get("city"),  # 市
                    "district": geocode.get("district"),  # 区/县
                    "adcode": geocode.get("adcode"),  # 行政区划代码
                    "lng": geocode.get("location").split(",")[0],  # 经度（GCJ02）
                    "lat": geocode.get("location").split(",")[1],  # 纬度（GCJ02）
                    "level": geocode.get("level")  # 地址匹配级别
                }
            else:
                return {
                    "success": False,
                    "address": address,
                    "error": f"解析失败：{result.get('info', '未知错误')}",
                    "infocode": result.get("infocode")
                }

        except requests.exceptions.Timeout:
            return {"success": False, "address": address, "error": "请求超时"}
        except requests.exceptions.RequestException as e:
            return {"success": False, "address": address, "error": f"请求异常：{str(e)}"}
        except Exception as e:
            return {"success": False, "address": address, "error": f"解析异常：{str(e)}"}

    def reverse_geocode(self, lng: float, lat: float, radius: int = 1000) -> Dict:
        """
        逆地理编码：经纬度 → 地址（GCJ02 坐标系）
        :param lng: 经度
        :param lat: 纬度
        :param radius: 搜索半径（米）
        :return: 解析结果字典
        """
        params = {
            "key": self.api_key,
            "location": f"{lng},{lat}",
            "output": "JSON",
            "radius": radius,
            "extensions": "all"  # 返回全部信息
        }

        try:
            response = self.session.get(self.REVERSE_GEOCODE_API_URL, params=params, timeout=10)
            response.raise_for_status()
            result = response.json()

            if result.get("status") == "1":
                regeo = result["regeocode"]
                return {
                    "success": True,
                    "location": f"{lng},{lat}",
                    "formatted_address": regeo.get("formatted_address"),
                    "province": regeo.get("addressComponent", {}).get("province"),
                    "city": regeo.get("addressComponent", {}).get("city"),
                    "district": regeo.get("addressComponent", {}).get("district"),
                    "street": regeo.get("addressComponent", {}).get("streetNumber", {}).get("street"),
                    "number": regeo.get("addressComponent", {}).get("streetNumber", {}).get("number")
                }
            else:
                return {
                    "success": False,
                    "location": f"{lng},{lat}",
                    "error": f"解析失败：{result.get('info', '未知错误')}"
                }

        except Exception as e:
            return {"success": False, "location": f"{lng},{lat}", "error": f"解析异常：{str(e)}"}

    def convert_coordinate(self, lng: float, lat: float, output: str = "GCJ02") -> Dict:
        """
        坐标转换：经纬度转换为指定坐标系
        :param lng: 经度
        :param lat: 纬度
        :param output: 目标坐标系（GCJ02/BD09/GCJ02LL/BD09LL）
        :return: 转换结果字典
        """
        params = {
            "key": self.api_key,
            "locations": f"{lng},{lat}",
            "output": "JSON",
            "coordsys": "wgs84",  # 输入坐标系：WGS84（GPS 坐标系）
            "target": output  # 目标坐标系
        }

        try:
            response = self.session.get(self.CONVERT_API_URL, params=params, timeout=10)
            response.raise_for_status()
            result = response.json()
            if result.get("status") == "1" and len(result.get("locations", [])) > 0:
                location = result["locations"][0]
                return {
                    "success": True,
                    "location": f"{lng},{lat}",
                    "target": output,
                    "target_location": location.get("location")
                }
            else:
                return {
                    "success": False,
                    "location": f"{lng},{lat}",
                    "error": f"转换失败：{result.get('info', '未知错误')}"
                }

        except Exception as e:
            return {"success": False, "location": f"{lng},{lat}", "error": f"转换异常：{str(e)}"}

# -------------------------- 示例使用 --------------------------
if __name__ == "__main__":
   
    geocoder = AmapGeocoder()

