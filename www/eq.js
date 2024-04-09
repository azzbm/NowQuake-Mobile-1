var eq_data={};//history_int_layer已定义 in index.js
var history_center_marker=new AMap.Marker({position: [0, 0],icon: new AMap.Icon({size: new AMap.Size(32, 32),image: './resource/hypocenter.svg',imageSize: new AMap.Size(32, 32),imageOffset: new AMap.Pixel(0, 0)}),offset: new AMap.Pixel(-32/2, -32/2),zIndex: 999});
var eq_show_status=false;
var last_eq_md5="";
function dealeq(re){
    var tmp={},has_do=[];
    for(let i=0;i<re.length;i++){
        let the_data=re[i];
        if(!has_do.includes(the_data.eq_id2))
        {
            let the_eq={
                "id":"CENC"+the_data.eq_id2,
                "happen_time":the_data.happen_time,
                "hypocenter":the_data.hypocenter,
                "latitude":the_data.latitude,
                "longitude":the_data.longitude,
                "magnitude":the_data.magnitude,
                "depth":the_data.depth,
                "auto_flag":the_data.flag,
                "maxintensity":Math.round(getIntensity(the_data.magnitude,the_data.depth,0)),
            }
            // console.log(getIntensity(the_data.magnitude,the_data.depth,0));
            tmp[the_data.eq_id2]=the_eq;
            has_do.push(the_data.eq_id2);
        }  
    }
    eq_data=tmp;
    fresh_eq_div();
    if(CryptoJS.MD5(JSON.stringify(eq_data[Object.keys(eq_data)[0]]))!=last_eq_md5)
    {
        last_eq_md5=CryptoJS.MD5(JSON.stringify(eq_data[Object.keys(eq_data)[0]]));
        show_eq_int(eq_data[Object.keys(eq_data)[0]].latitude,eq_data[Object.keys(eq_data)[0]].longitude,eq_data[Object.keys(eq_data)[0]].id);
    }            
}
function fresh_eq_div(){
    var eq_div=document.getElementById('event-container');
    eq_div.innerHTML='';
    for(let i=0;i<Object.keys(eq_data).length;i++){
        var eq=eq_data[Object.keys(eq_data)[i]];
        if(eq!=undefined)
        {
            let item=add_item(eq.magnitude, "M", eq.hypocenter, "CENC", eq.happen_time, eq.depth, eq.maxintensity, eq.latitude, eq.longitude,eq.id);
            eq_div.appendChild(item);   
        }
    }
}
function add_item(magnitude, magnitude_unit, location, from, time, depth, intensity, lat, lon,eqid) {
    // 创建父容器
    var earthquakeItem = document.createElement('div');
    earthquakeItem.classList.add('earthquake-item');
    earthquakeItem.setAttribute('data-magnitude', intensity);
    earthquakeItem.id=eqid;

    // 创建内部元素
    var square = document.createElement('div');
    square.classList.add('square');
    square.textContent = intensity;

    var info = document.createElement('div');
    info.classList.add('info');
    info.onclick = function() { show_eq_int(lat,lon,eqid); };

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
    depthDiv.textContent =depth+"KM";

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

    return earthquakeItem;
}
function show_eq_int(lat,lon,id){
    if(is_eew==true) 
    {
        console.error("正在显示地震预警，阻止显示历史烈度！");
        return;
    }
    var t_eq={};
    remove_eq_show();
    eq_show_status=true;
    for(let i=0;i<Object.keys(eq_data).length;i++){
        if(eq_data[Object.keys(eq_data)[i]].id==id){
            t_eq=eq_data[Object.keys(eq_data)[i]];
            break;
        }
    }
    if(t_eq=={}){
        return;
    }
    let most_far=0;
    for(let i=1;i<Object.keys(small_polygon_history).length;i++){
        var area = small_polygon_history[i].area;
        small_polygon_history[i].intensity[id] = Math.round(calculate_area_intensity(t_eq.magnitude, t_eq.depth, [t_eq.longitude,t_eq.latitude], area));
        if(small_polygon_history[i].intensity[id]>=1){
            let far=suan_area_most_far(lon,lat,area);  
            if(far>most_far){
                most_far=far;
            }
        }
    }//计算各个区域的烈度
    history_center_marker = new AMap.Marker({
        position: [lon, lat],
        icon: eew_hypocenter_tag(32),
        offset: new AMap.Pixel(-32/2, -32/2),
        zIndex: 999
    });
    history_center_marker.setMap(map);
    fresh_eq_int_layer();
    // console.log(most_far);
    let tmp_circle=new AMap.Circle({
        center: [lon, lat],
        radius: most_far*1000,
    });
    map.setFitView([tmp_circle]);
    map.setCenter([lon,lat]);
    // map.setZoom(map.getZoom()+0.2);
}
function remove_eq_show(){
    eq_show_status=false;
    history_center_marker.setMap(null);
    if(history_int_layer){
        history_int_layer.clearOverlays();
    }
    for(let i=1;i<Object.keys(small_polygon_history).length;i++){
        small_polygon_history[i].intensity={normal:0};
    }
}
function suan_area_most_far(lon,lat,area){
    let most_far=0;
    for(let i=0;i<area.length;i++){
        far = getDistance(lat,lon,area[i][1],area[i][0]);
        if(far>most_far){
            most_far=far;
        }
    }
    return most_far;
}