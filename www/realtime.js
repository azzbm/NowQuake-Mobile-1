var nied_station_list=[],nied_layer=new AMap.OverlayGroup();
var wolfx_station_list={},wolfx_layer=new AMap.OverlayGroup();
var wolfx_realtime_websocket=null;
//两个的逻辑不一样，不能替换
var nied_colorList = {"a":"#010ed6","b":"#002ce7","c":"#0040f4","d":"#0070da","e":"#00a8af","f":"#06d481","g":"#1fe55e","h":"#36f63e","i":"#65fb28","j":"#88fc1f","k":"#beff0d","l":"#d7fe07","m":"#effe01","n":"#fef802","o":"#feea00","p":"#ffdc02","q":"#fcbd00","r":"#fc9e00","s":"#fc8100","t":"#fa6300","u":"#ff4400","v":"#fc2800","w":"#f60d00","x":"#e90000","y":"#ce0000", "z":"#b00201"};
function init_nied_realtime() {
    get_nied_stations();
}
async function get_nied_stations() {
    let the_url="https://weather-kyoshin.east.edge.storage-yahoo.jp/SiteList/sitelist.json";
    fetch(the_url).then(response => {
        return response.json();
    }).then(data => {
        let station_list = data.items;
        if(station_list.length>0){
            nied_station_list=station_list;
        }
        console.log("NIED Station List Loaded");
    }).catch(error => {
        console.error("Can't get NIED Station List");
    });
}
async function get_nied_realtime(){
    let tokyo_date = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Tokyo"}));
    let year=tokyo_date.getFullYear();
    let month=tokyo_date.getMonth()+1<10?"0"+(tokyo_date.getMonth()+1):tokyo_date.getMonth()+1;
    let day=tokyo_date.getDate()<10?"0"+tokyo_date.getDate():tokyo_date.getDate();
    let hour=tokyo_date.getHours()<10?"0"+tokyo_date.getHours():tokyo_date.getHours();
    let minute=tokyo_date.getMinutes()<10?"0"+tokyo_date.getMinutes():tokyo_date.getMinutes();
    let second=tokyo_date.getSeconds()-2<10?"0"+(tokyo_date.getSeconds()-2):tokyo_date.getSeconds()-2;
    let url="https://weather-kyoshin.east.edge.storage-yahoo.jp/RealTimeData/"+ year + month + day + "/" + year + month + day + hour + minute + second+".json";
    fetch(url).then(response => {
        if (response.ok === false) {
            console.error("NIED Realtime Data failure!");
            return;
        }
        return response.json();
    }).then(data => {
        let realtimedata=data.realTimeData.intensity;
        // console.log("realtimedata",realtimedata);
        if(realtimedata.length!==nied_station_list.length){
            console.error("NIED Realtime number not match!");
            get_nied_stations();
            return;
        }
        let data_to_station=[];
        for(let i=0;i<realtimedata.length;i++){
            let the_data=realtimedata[i];
            let the_station=nied_station_list[i];
            for(let j=0;j<Object.keys(nied_colorList).length;j++){
                if(the_data===Object.keys(nied_colorList)[j]){
                    data_to_station.push({station: the_station, color:nied_colorList[Object.keys(nied_colorList)[j]]});
                    break;
                }
            }
        }
        nied_layer.clearOverlays();
        for(let i=0;i<data_to_station.length;i++){
            let the_station=data_to_station[i].station;
            let the_color=data_to_station[i].color;
            let marker = new AMap.CircleMarker({
                center: [the_station[1],the_station[0]],
                radius: 10,
                strokeColor: "white",
                strokeOpacity: 0.6,
                strokeWeight: 1,
                fillColor: the_color,
                fillOpacity: 1,
                zIndex: 999
            });
            nied_layer.addOverlay(marker); 
        }
        map.add(nied_layer);
        nied_layer.on('rightclick', function (e) {
            last_rightclick = [e.lnglat.getLng(), e.lnglat.getLat()]
            contextMenu.open(map, e.lnglat);
        });
        updateCircleRadius();
        console.log("NIED Realtime Data Loaded");
    }).catch(error => {
        console.error("Can't get NIED Realtime Data",error);
    });
}
async function get_wolfx_stations() {
    let the_url="https://api.wolfx.jp/seis_list.json";
    fetch(the_url).then(response => {
        return response.json();
    }).then(data => {
        let station_list = {};  
        wolfx_layer.clearOverlays();
        for(let i=0;i<Object.keys(data).length;i++){
            let this_s=data[Object.keys(data)[i]];
            let this_format=
            {
                "enable": this_s.enable,
                "global_name": this_s.name,
                "cn_name": this_s.location,
                "location": [this_s.latitude, this_s.longitude],
                "lastupdate": 0,
                "marker": new AMap.CircleMarker({
                    center: [this_s.longitude,this_s.latitude],
                    radius: 10,
                    strokeColor: "white",
                    strokeOpacity: 0.6,
                    strokeWeight: 1,
                    fillColor: "gray",
                    fillOpacity: 1,
                    zIndex: 999
                })
            }
            wolfx_layer.addOverlay(this_format.marker);
            station_list[Object.keys(data)[i]]=this_format;
        }
        if(Object.keys(station_list).length>0){
            map.add(wolfx_layer);
            wolfx_station_list=station_list;
        }
        else{
            wolfx_layer.clearOverlays();
            throw new Error("Wolfx Station List is empty");
        }
        
        console.log("Wolfx Station List Loaded");
    }).catch(error => {
        console.error("Can't get Wolfx Station List",error);
    });
}
function connect_wolfx_realtime(){
    if(wolfx_realtime_websocket!==null){
        wolfx_realtime_websocket.close();
    }
    const ws_url="wss://seis.wolfx.jp/all_seis";
    wolfx_realtime_websocket = new WebSocket(ws_url);
    wolfx_realtime_websocket.onopen = function() {
        console.log("Wolfx Realtime WebSocket Connected");
    };
    wolfx_realtime_websocket.onmessage = function(event) {
        deal_wolfx_realtime(JSON.parse(event.data));
    };
    wolfx_realtime_websocket.onclose = function() {
        console.log("Wolfx Realtime WebSocket Closed");
        setTimeout(connect_wolfx_realtime, 2000);
    }
    wolfx_realtime_websocket.onerror = function() {
        console.error("Wolfx Realtime WebSocket Error");
    }
}
async function deal_wolfx_realtime(event){
    let the_station=event.type;
    if(the_station in wolfx_station_list)
    {
        let shindo=event.Max_CalcShindo;
        // let shindo=event.CalcShindo;
        shindo = Math.max(-2, Math.min(7, shindo));
        let map_shindo= (shindo + 2) * (25 / 9);
        map_shindo = Math.round(map_shindo);
        // console.log(the_station+":"+map_shindo);
        let color = nied_colorList[Object.keys(nied_colorList)[map_shindo]];
        wolfx_station_list[the_station].marker.setOptions({fillColor: color});
    }
    else{
        return;
    }
}
function fresh_wolfx_realtime(){
    wolfx_layer.clearOverlays();
    for(let i=0;i<Object.keys(wolfx_station_list).length;i++){
        let the_station=Object.keys(wolfx_station_list)[i];
        let the_marker=wolfx_station_list[the_station].marker;
        wolfx_layer.addOverlay(the_marker);
    }
    map.add(wolfx_layer);
}//这个函数不需要了，因为websocket会自动更新
init_nied_realtime();
get_wolfx_stations();
connect_wolfx_realtime();
setInterval(get_nied_realtime, 1000);
// setInterval(fresh_wolfx_realtime, 1000);
function updateCircleRadius() {
    let zoom = map.getZoom(); // 获取当前地图缩放级别
    const zoomMin = 4;
    const zoomMax = 7.3;
    const valueMin = 1.8;
    const valueMax = 7;
    // 确保zoom在范围内
    zoom = Math.max(Math.min(zoom, zoomMax), zoomMin);
    // 使用线性映射函数
    let radius = ((zoom - zoomMin) * (valueMax - valueMin) / (zoomMax - zoomMin)) + valueMin;

    // 获取图层中的所有覆盖物
    let overlays = nied_layer.getOverlays();
    // 遍历所有覆盖物，更新圆圈半径
    // console.log(overlays[0]);
    overlays.forEach(function (overlay) {
        // 如果覆盖物是圆形标记
        if (overlay instanceof AMap.CircleMarker) {
            overlay.setRadius(radius); // 设置新的半径
        }
    })
    overlays = wolfx_layer.getOverlays();
    // 遍历所有覆盖物，更新圆圈半径
    // console.log(overlays[0]);
    overlays.forEach(function (overlay) {
        // 如果覆盖物是圆形标记
        if (overlay instanceof AMap.CircleMarker) {
            overlay.setRadius(radius+3); // 设置新的半径
        }
    })
    // console.log("Circle Radius Updated");   
}
map.on('zoomchange', function () {
    updateCircleRadius(); // 调用函数更新圆圈半径
});
