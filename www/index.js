//=================强制改时区==========================
// 获取当前时区
var currentTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

// 如果当前时区不是东八区，则将其设置为东八区
if (currentTimeZone !== 'Asia/Shanghai') {
    // 设置时区为东八区
    process.env.TZ = 'Asia/Shanghai';
    console.log('时区已设置为东八区');
}
//=====================================================
//=================初始化=====================
const urlParams = new URLSearchParams(window.location.search);
var info_list_status = urlParams.get('showlist')=="false" ? true : false;
var mat_style = urlParams.get('style')=="black" ? "black" : 'normal';
var filter ={
    mag_min: urlParams.get('mag_min') ? urlParams.get('mag_min') : 0,
    mag_max: urlParams.get('mag_max') ? urlParams.get('mag_max') : 10,
    timestart: urlParams.get('timestart') ? urlParams.get('timestart') : 0,
    timeend: urlParams.get('timeend') ? urlParams.get('timeend') : 2147483646,
    intensity_min: urlParams.get('int_min') ? urlParams.get('int_min') : 0,
    intensity_max: urlParams.get('int_max') ? urlParams.get('int_max') : 99,
    place_match: urlParams.get('place') ? urlParams.get('place') : '',
    agency_match: urlParams.get('agency') ? urlParams.get('agency') : '',
    init_map: urlParams.get('map') ? urlParams.get('map') : 'false',
};//默认过滤器
var marker_list=[];
var test_marker;
var selected_url=api_list[0];
var is_set_up=true;
var last_md5="";
var eew_event_list=[],eew_events={};
var home_location={lat: 29.84, lon: 106.05},home_marker;
//==================地图资源==================
var eew_hypocenter_tag = function(size){
    return new AMap.Icon({
        size: new AMap.Size(size, size),
        image: './resource/hypocenter.svg',                                                                         
        imageSize: new AMap.Size(size, size),
        imageOffset: new AMap.Pixel(0, 0)
    });
    };  
var eew_hypocenter_tag_hover = function(size){
    return new AMap.Icon({
        size: new AMap.Size(size, size),
        image: './resource/hypocenter-0.5.svg',                                                                         
        imageSize: new AMap.Size(size, size),
        imageOffset: new AMap.Pixel(0, 0)
    });
};
//==================地图相关==================
function initializeMap(center,style) {
    // z.prototype._createDefaultInnerDom = function() {
    //     return null; // 直接返回 null，避免创建默认的 img 元素
    // };
    if(style=='black'){
        var _features = ['bg'];
    }
    else{
        var _features = ['bg','road','building','point'];
    }
    map = new AMap.Map('map', {
      center: [center.lng, center.lat], // 初始中心坐标
      zoom: 4, // 初始缩放级别
      features: _features, // 地图的显示要素
      zooms: [4, 9], // 设置地图级别范围
    });
    if(style=='black'){
        map.setMapStyle('amap://styles/grey');
        map.on('complete', function() {
            draw_polygon();
            readCookie("home_location")?sethome(readCookie("home_location").split(",")[0],readCookie("home_location").split(",")[1]):sethome(29.84,106.05);
            hideLoading();//隐藏加载页面
        });
    }
    map.on('zoomchange', function() {
        if(map.getZoom()<=4){
            map.setZoom(4);
        }
        if(map.getZoom()>=9){
            map.setZoom(9);
        }
      });
    map.on('complete', function() {
        document.querySelector('.amap-container').style.backgroundImage = 'none';
    });
    contextMenu = new AMap.ContextMenu();
    contextMenu.addItem("测试渲染", function() {
        // test_area_fill(last_rightclick[1],last_rightclick[0]);
        // dealeew((Math.floor(Math.random() * (3 - 1 + 1)) + 1).toString(), Date.now(),"USGS",7.3,15 ,last_rightclick[1],last_rightclick[0],"测试");
        dealeew(Math.random().toString(), 1, Date.now(),"测试预警源",Math.floor(Math.random() * (7 - 3 + 1)) + 3,22 ,last_rightclick[1],last_rightclick[0],"测试");
        contextMenu.close();
    }, 0);
    contextMenu.addItem("清除渲染", function() {
        clear_area_fill();
        contextMenu.close();
    }, 1);
    contextMenu.addItem("获取屏幕中心坐标", function() {
        alert(map.getCenter()+"_"+map.getZoom());
        contextMenu.close();
    }, 2);
    contextMenu.addItem("获取鼠标坐标", function() {
        alert(last_rightclick);
        contextMenu.close();
    }, 3);
    contextMenu.addItem("获取屏幕最大化", function() {
        alert(IsOrNoFullScreen());
        contextMenu.close();
    }, 4);
              
    map.on('rightclick', function(e) {
      last_rightclick = [e.lnglat.getLng(), e.lnglat.getLat()]
      console.log(last_rightclick);
      contextMenu.open(map, e.lnglat);
    });
}//初始化地图
function add_marker(lat,lon,mag,depth){
    // var title=localname +" " + magnitude_unit + mag + " " + depth + "KM";
    // var zuobiao=[lon,lat];
    // marker_list.push({name: title, lnglat: zuobiao});
    var marker = new AMap.CircleMarker({
        center: new AMap.LngLat(lon, lat),
        radius: mag*2,
        zIndex:1,
        strokeColor: 'white',
        strokeWeight: depth*0.05,
        strokeOpacity: 0.8,
        fillColor: 'red',
        fillOpacity: 1,
    });
    marker.setMap(map);
    marker_list.push(marker);
}//添加标记
function clear_marker(){
    for(var i=0;i<marker_list.length;i++){
        marker_list[i].setMap(null);
    }
    marker_list=[];
}//清除地图上的标记
function jump_to(lat,lon,zoom){
    map.setCenter([lon, lat]);
    map.setZoom(zoom);
}//地图跳转
function point_in_window(lat,lon){
    var bounds = map.getBounds();
    var point = new AMap.LngLat(lon, lat);
    if (bounds.contains(point)) {
        return true;
      } else {
        return false;
      }
}//判断点是否在窗口内
function draw_china_polygon(){
    var boundaryLayer = new AMap.OverlayGroup();
    var geo_data_arr=province_cn.features;
    for(var i=0;i<geo_data_arr.length;i++){
        let geo_data=geo_data_arr[i];
        let polygon_data = geo_data.geometry.coordinates;
        //随机颜色
        // var color = '#'+Math.floor(Math.random()*16777215).toString(16);
        var the_polygon = new AMap.Polygon({
            path: polygon_data,
            strokeColor: "white",  //线颜色
            strokeOpacity: 1,     //线透明度
            strokeWeight: 0.5,      //线宽
            fillColor: "white", //填充色-透明
            fillOpacity: 0//填充透明度
        });
        boundaryLayer.addOverlay(the_polygon);
    }
    var the_polygon = new AMap.Polygon({
        path: china.features[0].geometry.coordinates,
        strokeColor: "white",  //线颜色
        strokeOpacity: 1,     //线透明度
        strokeWeight: 0.5,      //线宽
        fillColor: "white", //填充色-透明
        fillOpacity: 0//填充透明度
    })
    boundaryLayer.addOverlay(the_polygon);
    map.add(boundaryLayer);
}//绘制中国边界
function draw_china_city_polygon(){
    var boundaryLayer = new AMap.OverlayGroup();
    var geo_data_arr=city_china.features;
    for(var i=0;i<geo_data_arr.length;i++){
        let geo_data=geo_data_arr[i];
        let polygon_data = geo_data.geometry.coordinates;
        //随机颜色
        // var color = '#'+Math.floor(Math.random()*16777215).toString(16);
        var the_polygon = new AMap.Polygon({
            path: polygon_data,
            strokeColor: "white",  //线颜色
            strokeOpacity: 1,     //线透明度
            strokeWeight: 0.5,      //线宽
            fillColor: "white", //填充色-透明
            fillOpacity: 0//填充透明度
        });
        boundaryLayer.addOverlay(the_polygon);
    }
    map.add(boundaryLayer);
}//绘制中国城市边界
function draw_taiwan_city_polygon(){
    var boundaryLayer = new AMap.OverlayGroup();
    var geo_data_arr=city_taiwan.features;
    for(var i=0;i<geo_data_arr.length;i++){
        let geo_data=geo_data_arr[i];
        let polygon_data = geo_data.geometry.coordinates;
        //随机颜色
        // var color = '#'+Math.floor(Math.random()*16777215).toString(16);
        var the_polygon = new AMap.Polygon({
            path: polygon_data,
            strokeColor: "white",  //线颜色
            strokeOpacity: 1,     //线透明度
            strokeWeight: 0.5,      //线宽
            fillColor: "white", //填充色-透明
            fillOpacity: 0//填充透明度
        });
        boundaryLayer.addOverlay(the_polygon);
    }
    map.add(boundaryLayer);
}//绘制中国边界
function draw_japan_polygon(){
    var boundaryLayer = new AMap.OverlayGroup();
    var geo_data_arr=city_japan.features;
    for(var i=0;i<geo_data_arr.length;i++){
        let geo_data=geo_data_arr[i];
        let polygon_data = geo_data.geometry.coordinates;
        // var color = '#'+Math.floor(Math.random()*16777215).toString(16);
        var the_polygon = new AMap.Polygon({
            path: polygon_data,
            strokeColor: "white",  //线颜色
            strokeOpacity: 1,     //线透明度
            strokeWeight: 0.5,      //线宽
            fillColor: "white", //填充色-透明
            fillOpacity: 0//填充透明度
        });
        boundaryLayer.addOverlay(the_polygon);
    }
    map.add(boundaryLayer);
}//绘制日本边界
function draw_wolrd_polygon(){
    var boundaryLayer = new AMap.OverlayGroup();
    var geo_data_arr=wrold_country.features;
    for(var i=0;i<geo_data_arr.length;i++){
        let geo_data=geo_data_arr[i];
        let polygon_data = geo_data.geometry.coordinates;
        // var color = '#'+Math.floor(Math.random()*16777215).toString(16);
        var the_polygon = new AMap.Polygon({
            path: polygon_data,
            strokeColor: "white",  //线颜色
            strokeOpacity: 1,     //线透明度
            strokeWeight: 0.5,      //线宽
            fillColor: "white", //填充色-透明
            fillOpacity: 0//填充透明度
        });
        boundaryLayer.addOverlay(the_polygon);
    }
    map.add(boundaryLayer);
}//绘制世界边界
async function draw_polygon(){
    try {
        var boundaryLayer = new AMap.OverlayGroup();
        var japan_geo_data_arr=city_japan.features;
        var china_geo_data_arr=province_cn.features;
        for(var i=0;i<japan_geo_data_arr.length;i++){
            let geo_data=japan_geo_data_arr[i];
            let polygon_data = geo_data.geometry.coordinates;
            var the_polygon = new AMap.Polygon({
                path: polygon_data,
                strokeColor: "white",  //线颜色
                strokeOpacity: 1,     //线透明度
                strokeWeight: 0.5,      //线宽
                fillColor: "white", //填充色-透明
                fillOpacity: 0//填充透明度
            });
            boundaryLayer.addOverlay(the_polygon);
        }
        for(var i=0;i<china_geo_data_arr.length;i++){
            let geo_data=china_geo_data_arr[i];
            let polygon_data = geo_data.geometry.coordinates;
            var the_polygon = new AMap.Polygon({
                path: polygon_data,
                strokeColor: "white",  //线颜色
                strokeOpacity: 1,     //线透明度
                strokeWeight: 0.5,      //线宽
                fillColor: "white", //填充色-透明
                fillOpacity: 0//填充透明度
            });
            boundaryLayer.addOverlay(the_polygon);
        }
        var the_polygon = new AMap.Polygon({
            path: china.features[0].geometry.coordinates,
            strokeColor: "white",  //线颜色
            strokeOpacity: 1,     //线透明度
            strokeWeight: 0.5,      //线宽
            fillColor: "white", //填充色-透明
            fillOpacity: 0//填充透明度
        })
        boundaryLayer.addOverlay(the_polygon);
        map.add(boundaryLayer);
        boundaryLayer.on('rightclick', function(e) {
            last_rightclick = [e.lnglat.getLng(), e.lnglat.getLat()]
            contextMenu.open(map, e.lnglat);
        });
    }
    catch (error) {
        console.error('Error:', error);
    }
}//绘制基本边界
//==================列表相关==================
function add_item_1(magnitude, magnitude_unit, location, from, time, depth, intensity, lat, lon) {
    // 创建父容器
    var earthquakeItem = document.createElement('div');
    earthquakeItem.classList.add('earthquake-item');
    earthquakeItem.setAttribute('data-magnitude', intensity);

    // 创建内部元素
    var square = document.createElement('div');
    square.classList.add('square');
    square.textContent = intensity;

    var info = document.createElement('div');
    info.classList.add('info');
    info.onclick = function() { jump_to(lat,lon); };

    var timeFrom = document.createElement('div');
    timeFrom.classList.add('time-from');

    var locationDiv = document.createElement('div');
    locationDiv.classList.add('location');
    locationDiv.textContent = location;

    var fromDiv = document.createElement('div');
    fromDiv.classList.add('from');
    fromDiv.textContent = from;

    var timeDiv = document.createElement('div');
    timeDiv.classList.add('time');
    timeDiv.textContent = time;

    var magnitudeDepth = document.createElement('div');
    magnitudeDepth.classList.add('magnitude-depth');

    var magnitudeDiv = document.createElement('div');
    magnitudeDiv.classList.add('magnitude');
    magnitudeDiv.textContent = magnitude_unit + " " + magnitude;

    var depthDiv = document.createElement('div');
    depthDiv.classList.add('depth');
    depthDiv.textContent =depth;

    // 将内部元素添加到对应的容器中
    magnitudeDepth.appendChild(magnitudeDiv);
    magnitudeDepth.appendChild(depthDiv);

    timeFrom.appendChild(timeDiv);
    timeFrom.appendChild(fromDiv);

    info.appendChild(locationDiv);
    info.appendChild(timeFrom);
    info.appendChild(magnitudeDepth);

    earthquakeItem.appendChild(square);
    earthquakeItem.appendChild(info);

    // 将新创建的元素添加到容器中
    var container = document.getElementById('event-container');
    container.appendChild(earthquakeItem);
}//添加列表
function clear_item() {
    var container = document.getElementById('event-container');
    container.innerHTML = ''; // 清空容器中的所有内容
}//清除列表
//==================数据相关==================
async function init_little_polygons(){
    small_polygon={},small_polygon_history={};
    async function processCityFeatures(cityFeatures) {
        for (const feature of cityFeatures) {
            var areas = extPolygons(feature.geometry.coordinates);
            for (const key in areas) {
                var area = areas[key];
                if(area.length>=3)
                {
                    area=area
                }
                else{
                    area=area[0];
                }
                small_polygon[Object.keys(small_polygon).length+1] = {
                    area: area,
                    intensity: {
                        normal: 0,
                    }
                };
            }
        }
    }
    // Process all city features concurrently
    await Promise.all([
        processCityFeatures(city_taiwan.features),
        processCityFeatures(city_china.features),
        processCityFeatures(city_japan.features),
    ]);
    // 克隆 small_polygon 到 small_polygon_history
    for (const key in small_polygon) {
        small_polygon_history[key] = { ...small_polygon[key] };
    }
}//初始化小多边形
function calculateCentroid(polygons) {
    let totalX = 0;
    let totalY = 0;
    let totalPoints = 0;

    polygons.forEach(polygon => {
        polygon.forEach(point => {
            totalX += point[0];
            totalY += point[1];
            totalPoints++;
        });
    });

    const centerX = totalX / totalPoints;
    const centerY = totalY / totalPoints;

    return [centerX, centerY];
}
function calculate_area_intensity(mag,dep,center,area){
    var area_int=0;
    var hypo_lat=center[1];
    var hypo_lon=center[0];
    // console.log(area[0].length);
    for(var i=0;i<area.length;i++){
        var this_polygon=area[i];
        var lat=this_polygon[1];
        var lon=this_polygon[0];
        var distance=getDistance(lat,lon,hypo_lat,hypo_lon);
        var intensity=getIntensity(mag,dep,distance);
        if(intensity>0&&intensity>area_int){
            area_int=intensity;
        }
    }
    if(area_int>12){
        area_int=12;
    }
    return area_int;
}//计算区域烈度
function getDistance(lat1, lng1, lat2, lng2) {
    var radLat1 = lat1 * Math.PI / 180.0;
    var radLat2 = lat2 * Math.PI / 180.0;
    var a = radLat1 - radLat2;
    var b = lng1 * Math.PI / 180.0 - lng2 * Math.PI / 180.0;
    var s = 2 * Math.asin(Math.sqrt(Math.pow(Math.sin(a / 2), 2) +
      Math.cos(radLat1) * Math.cos(radLat2) * Math.pow(Math.sin(b / 2), 2)));
    s = s * 6378.137;
    s = Math.round(s * 10000) / 10000;
    return s;
  }//计算距离
function getIntensity(magnitude, depth, distance) {
    if(depth<=5){
      depth=5;
    }
    far = Math.sqrt(distance * distance + depth * depth);
    let localIntensity = 1.92 + 1.63 * magnitude - 3.49 * Math.log(far) / Math.log(10);
    if (localIntensity < 0) {
      localIntensity = 0;
    }
    if(localIntensity>12){
        localIntensity=12;
    }
    return localIntensity;
}//计算烈度
function mapRange(x, a, b, c, d) {
    return (x - a) * (d - c) / (b - a) + c;
}
function formatTimestamp(timestamp) {
    // 根据时间戳长度进行处理
    if (timestamp.toString().length === 10) {
        timestamp *= 1000; // 将10位时间戳转换为13位
    } else if (timestamp.toString().length !== 13) {
        throw new Error('Invalid timestamp length. It should be either 10 or 13 digits.');
    }
  
    // 创建日期对象
    var date = new Date(timestamp);
  
    // 加上 UTC+8 时区的偏移量
    var utcOffset = 8 * 60; // 8小时的偏移量
    // date.setMinutes(date.getMinutes() + utcOffset);
  
    // 获取年、月、日、小时、分钟、秒
    var year = date.getFullYear();
    var month = ('0' + (date.getMonth() + 1)).slice(-2);
    var day = ('0' + date.getDate()).slice(-2);
    var hours = ('0' + date.getHours()).slice(-2);
    var minutes = ('0' + date.getMinutes()).slice(-2);
    var seconds = ('0' + date.getSeconds()).slice(-2);
  
    // 格式化日期时间字符串
    var formattedDateTime = year + '-' + month + '-' + day + ' ' + hours + ':' + minutes + ':' + seconds;
  
    return formattedDateTime;
}
function extPolygons(coordinates) {
    let polygons = {};
    for (let i = 0; i < coordinates.length; i++) {
        let polygon = coordinates[i];
        polygons[i + 1] = polygon;
    }
    return polygons;
}//提取多边形
function sethome(lat,lon){
    if(home_marker){
        home_marker.setMap(null);
    }
    home_marker = new AMap.Marker({
        position: [lon, lat],
        icon: new AMap.Icon({
            size: new AMap.Size(18, 18),
            image: './resource/home.svg',
            imageSize: new AMap.Size(18, 18),
        }),
        offset: new AMap.Pixel(-9, -9),
        zIndex: 0
    });
    home_location={lat: lat, lon: lon};
    home_marker.setMap(map);
    home_marker.on('rightclick', function (e) {
        last_rightclick = [e.lnglat.getLng(), e.lnglat.getLat()]
        contextMenu.open(map, e.lnglat);
    });
    document.getElementById('mylocation-latitude').value=lat;
    document.getElementById('mylocation-longitude').value=lon;
    writeCookie("home_location",lat+","+lon);
}//设置家
function readCookie(cookieName) {
    var allCookies = document.cookie;
    var cookiesArray = allCookies.split(';');

    for (var i = 0; i < cookiesArray.length; i++) {
        var cookie = cookiesArray[i].trim();
        var cookieParts = cookie.split('=');
        var currentCookieName = cookieParts[0];
        var currentCookieValue = cookieParts[1];

        if (currentCookieName === cookieName) {
            // 返回找到的cookie的值
            return decodeURIComponent(currentCookieValue);
        }
    }

    // 如果没有找到指定名称的cookie，则返回null
    return null;
}// 读取cookie
function writeCookie(cookieName, cookieValue) {
    // 设置cookie的过期时间为30天
    var expirationDate = new Date();
    expirationDate.setTime(expirationDate.getTime() + (30 * 24 * 60 * 60 * 1000));
    var expires = "expires=" + expirationDate.toUTCString();

    // 使用encodeURIComponent来编码cookie值，以防止特殊字符的问题
    document.cookie = cookieName + "=" + encodeURIComponent(cookieValue) + ";" + expires + ";path=/";
}// 写入cookie
//==================API相关==================
function get_http_or_https(){
    var http = location.protocol;
    return http;
}//获取当前连接类型
//==================页面逻辑==================
function swich_info() {
    const infoContainer = document.getElementById('event-container');
    const mapElement = document.getElementById('map');
    const switchElement = document.getElementById('swich');
    const info_table=document.getElementById('event-container');
    if (info_list_status) {
        // 列表收起
        infoContainer.style.width = '0';
        mapElement.style.width = '100%';
        switchElement.style.transform = 'translate(5px, 5px) rotate(45deg)';
        info_table.style.padding = '0';
    } else {
        // 列表展开
        infoContainer.style.width = '450px'; // 调整宽度为您希望的展开宽度
        mapElement.style.width = 'calc(100% - 450px)'; // 调整地图的宽度
        switchElement.style.transform = 'translate(-5px, 5px) rotate(225deg)';
        info_table.style.padding = '10px';
    }

    // 切换列表状态
    info_list_status = !info_list_status;
}//切换列表显示
function showtime(){
    var time_div=document.getElementById("time_show");
    time_div.innerHTML=formatTimestamp(Date.now());
}//显示时间
function showLoading() {
    document.getElementById("overlay").style.display = "flex";
}// 显示加载页面
function hideLoading() {
    document.getElementById("overlay").style.display = "none";
}// 隐藏加载页面
function shipeishouji(){
    function isMobileDevice() {
        const userAgent = navigator.userAgent.toLowerCase();
        const mobileKeywords = ['iphone', 'ipod', 'android', 'blackberry', 'windows phone', 'nokia', 'opera mini', 'sonyericsson', 'opera mobi', 'iemobile'];
        
        return mobileKeywords.some(keyword => userAgent.includes(keyword));
    }    
    if(isMobileDevice())
    {
        document.getElementById("right-down").style["transform-origin"] = "bottom right";
        document.getElementById("right-down").style.transform="scale(0.5)";
        document.getElementById("eew-show").style["transform-origin"] = "top left";
        document.getElementById("eew-show").style.transform="scale(0.8)";
        document.getElementById('event-container').style.width='250px';
        document.getElementById('map').style.width='calc(100% - 250px)';
        
        
        swich_info = function() {
            const infoContainer = document.getElementById('event-container');
            const mapElement = document.getElementById('map');
            const switchElement = document.getElementById('swich');
            const info_table=document.getElementById('event-container');
            if (info_list_status) {
                // 列表收起
                infoContainer.style.width = '0';
                mapElement.style.width = '100%';
                switchElement.style.transform = 'translate(5px, 5px) rotate(45deg)';
                info_table.style.padding = '0';
            } else {
                // 列表展开
                infoContainer.style.width = '300px'; // 调整宽度为您希望的展开宽度
                mapElement.style.width = 'calc(100% - 300px)'; // 调整地图的宽度
                switchElement.style.transform = 'translate(-5px, 5px) rotate(225deg)';
                info_table.style.padding = '10px';}// 切换列表状态
                info_list_status = !info_list_status;
                }
    }
}
//================烈度图层===================
var eew_int_layer = new AMap.OverlayGroup(),history_int_layer = new AMap.OverlayGroup();
function fresh_eew_int_layer(){
    if(eew_int_layer){
        eew_int_layer.clearOverlays();
    }//清除图层
    for(i=1;i<=Object.keys(small_polygon).length;i++){
        var area = small_polygon[i].area;
        var int=0;
        for (var key in small_polygon[i].intensity) {
            if (small_polygon[i].intensity[key] > int) {
                int = small_polygon[i].intensity[key];
            }
        }
        if(int>0){
            var the_polygon = new AMap.Polygon({
                path: area,
                strokeColor: "white",  //线颜色
                strokeOpacity: 1,     //线透明度
                strokeWeight: 0.5,      //线宽
                fillColor: int_to_color[int], //填充色-透明
                fillOpacity: 1//填充透明度
            });
            eew_int_layer.addOverlay(the_polygon);
        }
    }//渲染图层
    map.add(eew_int_layer);//添加图层
    eew_int_layer.on('rightclick', function (e) {
        last_rightclick = [e.lnglat.getLng(), e.lnglat.getLat()]
        contextMenu.open(map, e.lnglat);
    });
}//刷新烈度图层
function fresh_eq_int_layer(){
    if(history_int_layer){
        history_int_layer.clearOverlays();
    }//清除图层
    for(i=1;i<=Object.keys(small_polygon_history).length;i++){
        var area = small_polygon_history[i].area;
        var int=0;
        for (var key in small_polygon_history[i].intensity) {
            if (small_polygon_history[i].intensity[key] > int) {
                int = small_polygon_history[i].intensity[key];
            }
        }
        if(int>0){
            var the_polygon = new AMap.Polygon({
                path: area,
                strokeColor: "white",  //线颜色
                strokeOpacity: 1,     //线透明度
                strokeWeight: 0.5,      //线宽
                fillColor: int_to_color[int], //填充色-透明
                fillOpacity: 1//填充透明度
            });
            history_int_layer.addOverlay(the_polygon);
        }
    }//渲染图层
    map.add(history_int_layer);//添加图层
    history_int_layer.on('rightclick', function (e) {
        last_rightclick = [e.lnglat.getLng(), e.lnglat.getLat()]
        contextMenu.open(map, e.lnglat);
    });
} 
//==================测试=====================
function coordinates_length(){
    let nums={};
    for(var i=0;i<city_china.features.length;i++){
        var polygon = city_china.features[i].geometry.coordinates;
        if(polygon.length >2){
            console.log(city_china.features[i].properties.fullname + " " + polygon.length);
        }
    }
    console.log(nums);
}//测试坐标长度
async function test_area_fill(lat, lon) {
    var event_uuid = Date.now();
    if (int_layer) {
        int_layer.clearOverlays();
    }
    int_layer = new AMap.OverlayGroup();
    var center = [90.95, 38.38];
    var mag = 5.5;
    var dep = 10;
    for(i=1;i<=Object.keys(small_polygon).length;i++){
        var area = small_polygon[i].area;
        small_polygon[i].intensity[event_uuid] = Math.round(calculate_area_intensity(mag, dep, center, area));
        var int=0;
        for (var key in small_polygon[i].intensity) {
            if (small_polygon[i].intensity[key] > int) {
                int = small_polygon[i].intensity[key];
            }
        }
        if(int>0){
            var the_polygon = new AMap.Polygon({
                path: area,
                strokeColor: "white",  //线颜色
                strokeOpacity: 1,     //线透明度
                strokeWeight: 0.5,      //线宽
                fillColor: int_to_color[int], //填充色-透明
                fillOpacity: 1//填充透明度
            });
            int_layer.addOverlay(the_polygon);
        }
    }
    map.add(int_layer);
    var marker = new AMap.Marker({
        position: center,
        icon: eew_hypocenter_tag,
        offset: new AMap.Pixel(-16, -16),
        zIndex: 999
    });
    marker.setMap(map);
    int_layer.on('rightclick', function (e) {
        last_rightclick = [e.lnglat.getLng(), e.lnglat.getLat()]
        contextMenu.open(map, e.lnglat);
    });
}
function clear_area_fill(){
    int_layer.clearOverlays();
}//清除区域烈度
//==================主程序=====================
shipeishouji();
init_little_polygons();
initializeMap({lng: 110.144206, lat: 33.4131},"black");
map.setZoom(4.63);     
console.log(get_http_or_https());  
connectToServer();
setInterval(() => {
    showtime();
}, 500);                        
swich_info(); //初始化列表显示 
// swich_info();     
// setInterval(get_md5, 5000); 