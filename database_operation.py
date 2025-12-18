import mysql.connector
from mysql.connector import Error
import os
from dotenv import load_dotenv



# 加载环境变量
load_dotenv()

# -------------------------- 配置项 --------------------------
load_dotenv()
DATABASE_PASSWORD = os.getenv('DATABASE_PASSWORD')
DATABASE_PORT = int(os.getenv('DATABASE_PORT'))
DATABASE_HOST = os.getenv('DATABASE_HOST')
DATABASE_USER = os.getenv('DATABASE_USER')
DATABASE_NAME = os.getenv('DATABASE_NAME')



class databaseOperation:
    def __init__(self):
        self.config = {
        "host": DATABASE_HOST,       # 数据库地址
        "port": DATABASE_PORT,              # 端口
        "user": DATABASE_USER,            # 用户名
        "password": DATABASE_PASSWORD,      # 密码
        "database": DATABASE_NAME,  # 提前创建的数据库名
        "charset": "utf8mb4"       # 字符集（与表结构一致）
    }

    def connect(self):
        try:
            connection = mysql.connector.connect(**self.config)
            if connection.is_connected():
                cursor = connection.cursor()
                print("数据库连接成功")
                return connection, cursor
        except Error as e:
            print(f"数据库连接失败: {e}")
            return None, None
    
    def close(self, connection, cursor):
        if cursor:
            cursor.close()
        if connection:
            connection.close()
            print("数据库连接已关闭")

    def get_all_fmo_info(self):
        connection, cursor = self.connect()
        if connection and cursor:
            try:
                query = """
                    SELECT fs.callsign ,fs.latitude ,fs.longitude ,fs.comment ,fs.fmo_id ,fs.fmo_name ,fs.fmo_ip ,fs.fmo_port ,fs.fmo_cover ,fs.fmo_equip ,fs.fmo_pass ,fs.fmo_sign ,fs.create_time 
                    from fmo_station fs ORDER BY  fs.create_time DESC """
                print(query)
                
                cursor.execute(query)
                results = cursor.fetchall()
                print(f'查询到 {len(results)} 个FMO站点信息')
                return results
            except Error as e:
                print(f"查询fmo信息失败: {e}")
                return None
            finally:
                self.close(connection, cursor)


    def get_all_aprs_info_latest(self):
        connection, cursor = self.connect()
        if connection and cursor:
            try:
                query = """
                    SELECT adl.callsign ,adl.`path` ,adl.destination ,adl.format ,adl.longitude ,adl.latitude ,adl.speed ,adl.altitude ,adl.timestamp_orig,adl.comment,adl.create_time 
                    from aprs_data_lastest adl 
                    where adl.longitude is not null
                    order by adl.create_time """
                print(query)
                
                cursor.execute(query)
                results = cursor.fetchall()
                print(f'查询到 {len(results)} 个APRS站点信息')
                return results
            except Error as e:
                print(f"查询aprs信息失败: {e}")
                return None
            finally:
                self.close(connection, cursor)



if __name__ == "__main__":
    db_op = databaseOperation()
    elements = db_op.get_all_aprs_info_latest()
    for element in elements:
        print(element)