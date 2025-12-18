from flask import Flask
from flask import render_template
from database_operation import databaseOperation

app = Flask(__name__)

@app.route("/")
def index():
    return render_template('index.html', name = "HAM")

@app.route('/hello/<name>')
def hello(name=None):
    return render_template('hello.html', person=name)


@app.route('/ham')
def ham():
    return render_template('ham.html', name = "HAM")   


@app.route('/fmo')
def fmo():
    return render_template('fmo.html', name = "FMO")   

@app.route('/about')
def about():
    return render_template('about.html', name = "ABOUT")   



@app.route('/aprs')
def aprs():
    return render_template('aprs.html', name = "APRS")   



# 以下为api专区
@app.route("/api/fmo")
def fmo_api():
    fmo_list = []
    db  = databaseOperation()
    result = db.get_all_fmo_info()
    for item in result:
        fmo_list.append({"callsign":item[0],"latitude" :item[1],"longitude": item[2],"comment": item[3],"fmo_id": item[4],"fmo_name" : item[5],"fmo_ip" : item[6],
                         "fmo_port" : item[7],"fmo_cover" : item[8],"fmo_equip" : item[9],"fmo_pass" : item[10],"fmo_sign" : item[11],"create_time": item[12]})
    return {"message":"数据读取成功","totle":len(result),"data":fmo_list}


@app.route("/api/aprs")
def aprs_api_all():
    aprs_list = []
    db  = databaseOperation()
    result = db.get_all_aprs_info_latest()
    for item in result:
        aprs_list.append({"callsign":item[0],"path" :item[1],"destination" : item[2],"format" : item[3],"longitude" : item[4],"latitude" : item[5],"speed" : item[6],
                         "altitude" : item[7],"timestamp_orig" : item[8],"comment" : item[9],"create_time" : item[10]})
    return {"message":"数据读取成功","totle":len(result),"data":aprs_list}

