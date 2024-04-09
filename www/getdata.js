var data_websocket; // 全局 WebSocket 对象
var api_list = {
    "hk-1": {
        url: "hk-1.nowquake.cn",
        wrong_times: 0,
        last_success_time: 0,
    },
    "in-1": {
        url: "in-1.nowquake.cn",
        wrong_times: 0,
        last_success_time: 0,
    },
    "us-3": {
        url: "us-3.nowquake.cn",
        wrong_times: 0,
        last_success_time: 0,
    }
}; //全球数据源列表
var current_server = "in-1"; // 当前服务器
function testConnection(url, callback) {
    var start = Date.now();
    var socket = new WebSocket("wss://" + url);

    socket.onopen = function () {
        var latency = Date.now() - start;
        socket.close();
        callback(null, latency);
    };

    socket.onerror = function (error) {
        callback(error);
    };
}
function switchServer() {
    var servers = Object.keys(api_list);
    var currentIndex = servers.indexOf(current_server);
    currentIndex = (currentIndex + 1) % servers.length;
    current_server = servers[currentIndex];
    show_now_server(current_server); 
}
function connectToServer() {
    var url = api_list[current_server].url;
    connectwebsocket(url);
    show_now_server(current_server);
}
function reconnectToServer() {
    show_now_server("reconnecting");
    if(api_list[current_server].url.includes("192.168.0.202"))
    {
        data_websocket = new WebSocket("ws://" + api_list[current_server].url); // 重新使用全局 WebSocket 对象
    }
    else{
        data_websocket = new WebSocket("wss://" + api_list[current_server].url); // 重新使用全局 WebSocket 对象
    }
    for (var server in api_list) { // 重置所有服务器的 wrong_times
        api_list[server].wrong_times = 0;
    }
}
function connectwebsocket(url) {
    if(url.includes("192.168.0.202"))
    {
        url="ws://"+url
    }
    else{
        url="wss://"+url
    }
    data_websocket = new WebSocket(url); // 初始化全局 WebSocket 对象

    data_websocket.onopen = function (event) {
        console.log("Connected to server");
        api_list[current_server].last_success_time = Date.now();
        api_list[current_server].wrong_times = 0;
        data_websocket.send("query_cenceq");
        data_websocket.send("query_jmaeew");
        data_websocket.send("query_sceew");
        data_websocket.send("query_cwaeew");
        data_websocket.send("query_fjeew");
        data_websocket.send("query_icleew");
    };

    data_websocket.onmessage = function (event) {
        var data = JSON.parse(event.data);
        if (data.type.includes("eew")) {
            let from = "未知"
            switch (data.type) {
                case "sc_eew":
                    from = "四川地震局";
                    break;
                case "jma_eew":
                    from = "日本气象厅";
                    break;
                case "cwa_eew":
                    from = "中央气象局";
                    break;
                case "fj_eew":
                    from = "福建地震局";
                    break;
                case "icl_eew":
                    from = "ICL预警网";
                    break;
                default:
                    from = "未知";
                    break;
            }
            console.log("收到" + from + "的地震预警")
            dealeew(data.event_id,data.report_num,data.happen_time,from,data.magnitude,data.depth,data.latitude,data.longitude,data.hypocenter);
        }
        if (data.type == "cenc_eqlist") {
            console.log("收到CENC地震列表");
            dealeq(data.data);
        }
    };

    data_websocket.onclose = function (event) {
        console.log("Disconnected from server");
        var elapsed = Date.now() - api_list[current_server].last_success_time;
        if (elapsed > 5000) {
            api_list[current_server].wrong_times++;
            if (api_list[current_server].wrong_times >= 1) {
                switchServer();
            }
            reconnectToServer();
        }
        setTimeout(connectToServer, 2000);
    };

    data_websocket.onerror = function (event) {
        console.error("Websocket Error: " + event);
    };
}
function show_now_server(server){
    let server_div=document.getElementById('now_server');
    server_div.innerHTML="当前服务器："+server;
}

async function  urlspeedtest(apiList) {
    let fastestUrl = null;
    let fastestTime = Infinity;
    let time_list=[];
    //循环请求
    for (let i=0;i<Object.keys(apiList).length;i++){
        const url = apiList[Object.keys(apiList)[i]].url;
        const startTime = performance.now(); // 获得当前时间
        try {
            const controller = new AbortController();
            const signal = controller.signal;

            const timeoutId = setTimeout(() => {
                controller.abort();
            }, 1000);

            const response = await fetch("https://"+url+"/delay_test?time="+Date.now(), { signal });
            clearTimeout(timeoutId);
            const endTime = performance.now(); // 获得当前时间
            const elapsedTime = endTime - startTime; // 计算时间差
            if (elapsedTime < fastestTime) {
                fastestTime = elapsedTime;
                fastestUrl = url;
            }
            time_list.push({url: url.split(".")[0], time: Math.round(elapsedTime*100)/100});
        } catch (error) {
            // 如果请求超时或者其他错误，记录为超时
            time_list.push({url: url.split(".")[0], time: "Timeout"});
        }
    }
    console.table(time_list);
    selected_url = fastestUrl;
    return fastestUrl.split(".")[0];
}//api测速