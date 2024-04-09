var P_Wave_Speed=6.5;
var S_Wave_Speed=4;
var is_eew=false;
function dealeew(event_id,report_num,time,from,magnitude,depth,lat,lon,hypocenter){
    if(eew_events[from+"_"+event_id]!=undefined){
        for(let i=1;i<Object.keys(small_polygon).length;i++){
            delete small_polygon[i].intensity[from+"_"+event_id];
        }
        eew_events[from+"_"+event_id].hypocenter_marker.setMap(null);       
        //注销定时器
        clearInterval(eew_events[from+"_"+event_id].P_circle_Interval);
        clearInterval(eew_events[from+"_"+event_id].S_circle_Interval);
        eew_events[from+"_"+event_id].P_circle.setMap(null);
        eew_events[from+"_"+event_id].S_circle.setMap(null);
        eew_events[from+"_"+event_id].serial_marker.setMap(null);
        var container = document.getElementById(eew_events[from+"_"+event_id].countdown_id);
        if (container) {
            container.remove();
        } else {
            console.log("容器不存在");
        }
        // delete eew_events[from+"_"+event_id];
    }
    var this_event=
    {
        time: new Date(time),
        from: from,
        report_num: report_num,
        magnitude: magnitude,
        depth: depth,
        latitude: lat,
        longitude: lon,
        hypocenter: hypocenter,
        distance: getDistance(lat,lon,home_location.lat,home_location.lon),
        maxintensity: Math.round(getIntensity(magnitude, depth, 0)),
        maxintensity_raw: getIntensity(magnitude, depth, 0),
        localintensity: Math.round(getIntensity(magnitude, depth, getDistance(lat,lon,home_location.lat,home_location.lon))),
        localintensity_raw: getIntensity(magnitude, depth, getDistance(lat,lon,home_location.lat,home_location.lon)),
    }//初始化地震事件
    let eventid=from +"_"+ event_id;//需要保证同一个地震事件相同，不加入报数
    if((Date.now()-this_event.time.getTime())/1000*S_Wave_Speed>maxDistanceSWaveSpread(magnitude,depth)){
        console.log("收到eew但过时");
        return;
    }//如果地震波传播到达的距离大于最大传播距离，不处理

    for(let i=1;i<Object.keys(small_polygon).length;i++){
        var area = small_polygon[i].area;
        small_polygon[i].intensity[eventid] = Math.round(calculate_area_intensity(magnitude, depth, [lon,lat], area));
    }//计算各个区域的烈度

    //地图标记
    function eew_hypocenter_tag_size(mag) {
        if(mag<2.0) return 12;
        if(mag>=2.0&&mag<3.0) return 18;
        if(mag>=3.0&&mag<4.0) return 24;
        if(mag>=4.0&&mag<5.0) return 32;
        if(mag>=5.0&&mag<6.0) return 36;
        if(mag>=6.0&&mag<7.0) return 48;
        if(mag>=7.0&&mag<8.0) return 48;
        if(mag>=8.0) return 48;
        return 24;
    }
    function S_color(int){
        if(int<=3) return "#00A0F1";
        if(int>3&&int<=5) return "#46BC67";
        if(int>5&&int<=6) return "#e68208";
        if(int>6&&int<=7) return "#ff4d00";
        if(int>7&&int<=8) return "#ff0000";
        if(int>8&&int<=10) return "#ff007b";
        if(int>10) return "#ff00ff";
    }
    var size = eew_hypocenter_tag_size(magnitude);
    this_event['hypocenter_marker'] = new AMap.Marker({
        position: [lon, lat],
        icon: eew_hypocenter_tag(size),
        offset: new AMap.Pixel(-size/2, -size/2),
        zIndex: 998
    });
    this_event['hypocenter_marker'].setMap(map);
    this_event['hypocenter_marker'].on('mouseover', function (e) {
        this_event['hypocenter_marker'].setIcon(eew_hypocenter_tag_hover(size));
    });
    this_event['hypocenter_marker'].on('mouseout', function (e) {
        this_event['hypocenter_marker'].setIcon(eew_hypocenter_tag(size));
    });
    this_event['serial_marker'] = new AMap.Marker({
        position: [lon, lat],
        content: '<div class="serial_circle" id="'+event_id+'_serial"><div class="serial_number">0</div></div>',
        offset: new AMap.Pixel(-15, -50),
        zIndex: 998
    });
    this_event['P_circle']=new AMap.Circle({
        center: [lon, lat],
        radius:0,
        strokeColor: "white",
        strokeOpacity: 0.8,
        strokeWeight: 3,
        fillColor: "white",
        fillOpacity: 0.1,
        zIndex: 997
    });
    this_event['S_circle']=new AMap.Circle({
        center: [lon, lat],
        radius: 0,
        strokeColor: S_color(this_event.maxintensity),
        strokeOpacity: 1,
        strokeWeight: 3,
        fillColor: S_color(this_event.maxintensity),
        fillOpacity: 0.4,
        zIndex: 998
    });
    this_event['P_circle'].setMap(map);
    this_event['S_circle'].setMap(map);
    this_event['P_circle_Interval']=setInterval(() => {
        this_event['P_circle'].setRadius(((Date.now()-this_event.time.getTime())/1000*P_Wave_Speed - depth)*1000);
    }, 10);
    this_event['S_circle_Interval']=setInterval(() => {
        this_event['S_circle'].setRadius(((Date.now()-this_event.time.getTime())/1000*S_Wave_Speed - depth)*1000);
        if(this_event['S_circle'].getRadius()>maxDistanceSWaveSpread(magnitude,depth)*1000){
            remove_eew_event(event_id,from);
        }
    }, 10);
    this_event['P_circle'].on('rightclick', function (e) {
        last_rightclick = [e.lnglat.getLng(), e.lnglat.getLat()]
        contextMenu.open(map, e.lnglat);
    });
    this_event['S_circle'].on('rightclick', function (e) {
        last_rightclick = [e.lnglat.getLng(), e.lnglat.getLat()]
        contextMenu.open(map, e.lnglat);
    });
    this_event['countdown_id'] = event_id+"_countdown";
    add_countdown(this_event['countdown_id']);
    this_event['show_id'] = from+event_id+report_num+magnitude+depth+lat+lon+hypocenter;
    //传入地震事件
    eew_events[eventid] = this_event;
    jump_to(this_event.latitude,this_event.longitude,7.5);
    //更新序号
    update_serial();
    show_eew_info();
    //更新强度图层
    fresh_eew_int_layer();

}
var show_eew_event_Interval,now_show_eew_event=1,last_show_eew_time=0,last_eew_length=0;
function show_eew_info(){
    let length=Object.keys(eew_events).length
    if(length>0)
    {
        if(eq_show_status==true)
        {
            remove_eq_show();
            eq_show_status=false;
        }
        is_eew=true;
        if(length>1)
        {
            if(Date.now()-last_show_eew_time>5000||last_eew_length!=length)
            {
                let will_show=now_show_eew_event+1;
                if(will_show>length) will_show=1;
                let will_data=eew_events[Object.keys(eew_events)[will_show-1]];
                // console.log(will_data);
                if(will_data!=undefined)
                {   
                    replace_eew_info(will_data.report_num,will_data.time,will_data.from,will_data.magnitude,will_data.depth,will_data.hypocenter,will_data.maxintensity,will_data.localintensity);
                    replace_eew_serial(will_show,length);
                    document.getElementById("eew-serial").style.display = "flex";
                    document.getElementById("eew-show").style.display = "block";
                    now_show_eew_event=will_show;
                    last_show_eew_time=Date.now();
                    last_eew_length=length;
                }
            
            }
        }
        else
        {
            let event=eew_events[Object.keys(eew_events)[0]];
            if(document.getElementById("eew-reportnum").showid != event.show_id)
            {
                replace_eew_info(event.report_num,event.time,event.from,event.magnitude,event.depth,event.hypocenter,event.maxintensity,event.localintensity,event.show_id);
                replace_eew_serial(1,1);
                document.getElementById("eew-serial").style.display = "none";
                document.getElementById("eew-show").style.display = "block";
                last_show_eew_time=Date.now();
                now_show_eew_event=1;
                console.log("change");
            }
            else{
                // console.log("no change");
            }
            // console.log(document.getElementById("eew-reportnum").showid,event.show_id);
        }
    }
    else{
        is_eew=false;
        document.getElementById("eew-show").style.display = "none";
        replace_eew_serial(1,1);
        now_show_eew_event=1;
    }
}
function set_fit_view(){
    if(Object.keys(eew_events).length==0) return;
    var P_circle_list = [];
    for(let i=0;i<Object.keys(eew_events).length;i++){
        P_circle_list.push(eew_events[Object.keys(eew_events)[i]].P_circle);
    }
    // P_circle_list.push(home_marker);
    for(let i=1;i<P_circle_list.length;i++){
        if(P_circle_list[i].getRadius()>8000000){
            P_circle_list[i].setRadius(8000000);
        }
    }
    map.setFitView(P_circle_list);
    // if(map.getZoom()<4) map.setZoom(map.getZoom()+2);
    // console.log(P_circle_list);
}
setInterval(show_eew_info, 200);
setInterval(set_fit_view, 5000);
setInterval(fresh_countdown, 500);
function replace_eew_info(report_num,time,from,magnitude,depth,hypocenter,maxintensity,localIntensity,id){
    document.getElementById("eew-from").innerText = from;
    document.getElementById("eew-reportnum").innerText = "第  "+report_num+"  报";
    document.getElementById("eew-reportnum").showid=id;
    document.getElementById("eew-location").innerText = hypocenter;
    document.getElementById("eew-time").innerText = formatTimestamp(time.getTime())+"   "+"发生"
    document.getElementById("eew-magnitude").innerText = "M  "+magnitude;
    document.getElementById("eew-depth").innerText = depth+"KM";
    document.getElementById("eew-int").innerText = maxintensity;
    document.getElementById("eew-int").style.backgroundColor = int_to_color[maxintensity];
    if(localIntensity<=1){
        document.getElementById("eew-notice").innerText = "无感地震，请勿惊慌";
    }
    else if(localIntensity<=3){
        document.getElementById("eew-notice").innerText = "有感地震，注意合理避险";
    }
    else if(localIntensity<=5){
        document.getElementById("eew-notice").innerText = "强有感地震，注意避险";
    }
    else if(localIntensity>5){
        document.getElementById("eew-notice").innerText = "破坏性地震，立即采取避险措施！";
    }

    if(magnitude>=6.0||maxintensity>=7){
        document.getElementById("eew-show").style.backgroundColor = "#bf0000";
    }
    else{
        document.getElementById("eew-show").style.backgroundColor = "#f28c07";
    }
}
function replace_eew_serial(now,all){
    document.getElementById("eew-serial-now").innerHTML = "&nbsp;"+now+"&nbsp;";
    document.getElementById("eew-serial-all").innerHTML = "&nbsp;"+all+"&nbsp;";

}
function add_countdown(id){
    var countdownItem = document.createElement('div');
    countdownItem.classList.add('countdown-item');
    countdownItem.id = id;
    
    // 创建包含序号的 div 元素
    var serialCircle = document.createElement('div');
    serialCircle.classList.add('cutdown-serial_circle');
    
    var serialNumber = document.createElement('div');
    serialNumber.classList.add('cutdown-serial_number');
    serialNumber.textContent = '0'; 
    serialNumber.id = id+"_serial";
    
    // 创建图片元素
    var img = document.createElement('img');
    img.classList.add('countdown-int');
    img.src = './resource/int/int0.png'; // 图片路径
    img.id = id+"_int";
    
    // 创建时间文本元素
    var time = document.createElement('div');
    time.classList.add('countdown-time');
    time.textContent = '00:00'; // 时间文本为 19:19
    time.id = id+"_time";
    
    // 将子元素添加到 countdownItem 中
    serialCircle.appendChild(serialNumber);
    countdownItem.appendChild(serialCircle);
    countdownItem.appendChild(img);
    countdownItem.appendChild(time);
    
    // 将 countdownItem 添加到文档中的某个容器中
    var container = document.getElementById('countdown-container'); // 假设有一个 ID 为 container 的容器
    container.appendChild(countdownItem);
}
function fresh_countdown(){
    for(let i=0;i<Object.keys(eew_events).length;i++){
        let id=eew_events[Object.keys(eew_events)[i]].countdown_id;
        let left_time = (eew_events[Object.keys(eew_events)[i]].distance+eew_events[Object.keys(eew_events)[i]].depth)/S_Wave_Speed-((Date.now()-eew_events[Object.keys(eew_events)[i]].time.getTime())/1000);
        if(left_time<0) left_time=0;
        let left_text = formatCountdown(left_time);
        document.getElementById(id+"_serial").textContent = i+1;
        document.getElementById(id+"_int").src = './resource/int/int'+eew_events[Object.keys(eew_events)[i]].localintensity+'.png';
        document.getElementById(id+"_time").textContent = formatCountdown(eew_events[Object.keys(eew_events)[i]].time.getTime());
        document.getElementById(id+"_time").textContent = left_text;
        if(left_time>60){
            document.getElementById(id+"_time").style.color = "green";
        }
        else if(left_time>30){
            document.getElementById(id+"_time").style.color = "yellow";
        }
        else if(left_time>=0){
            document.getElementById(id+"_time").style.color = "red";
        }
        else{
            document.getElementById(id+"_time").style.color = "green";
        }
    }
}
function remove_eew_event(event_id,from){
    if(eew_events[from+"_"+event_id]!=undefined){
        for(let i=1;i<Object.keys(small_polygon).length;i++){
            delete small_polygon[i].intensity[from+"_"+event_id];
        }
        eew_events[from+"_"+event_id].hypocenter_marker.setMap(null);       
        //注销定时器
        clearInterval(eew_events[from+"_"+event_id].P_circle_Interval);
        clearInterval(eew_events[from+"_"+event_id].S_circle_Interval);
        eew_events[from+"_"+event_id].P_circle.setMap(null);
        eew_events[from+"_"+event_id].S_circle.setMap(null);
        eew_events[from+"_"+event_id].serial_marker.setMap(null);
        var container = document.getElementById(eew_events[from+"_"+event_id].countdown_id);
        if (container) {
            container.remove();
        } else {
            console.log("容器不存在");
        }
        delete eew_events[from+"_"+event_id];
    }
    update_serial();    
    fresh_eew_int_layer();
    show_eew_info();
    set_fit_view();
    console.log(Object.keys(eew_events).length);
    if(Object.keys(eew_events).length==0){
        jump_to(38.262618,104.370878,5);
    }
}
function update_serial(){
    if(Object.keys(eew_events).length>1){
        for(let i=0;i<Object.keys(eew_events).length;i++){
            eew_events[Object.keys(eew_events)[i]].serial_marker.setContent('<div class="serial_circle" id="'+Object.keys(eew_events)[i].split("_")[1]+'_serial"><div class="serial_number">'+(i+1)+'</div></div>');
            eew_events[Object.keys(eew_events)[i]].serial_marker.setMap(map);
        }
    }
    else
    {
        for(let i=0;i<Object.keys(eew_events).length;i++){
            eew_events[Object.keys(eew_events)[i]].serial_marker.setContent('<div class="serial_circle" id="'+Object.keys(eew_events)[i].split("_")[1]+'_serial"><div class="serial_number">'+(i+1)+'</div></div>');
            eew_events[Object.keys(eew_events)[i]].serial_marker.setMap(null);
        }
    }
}
function maxDistanceSWaveSpread(magnitude,depth){
    // return 100;
    if(magnitude<=3.0) return 400;
    if(magnitude>3.0&&magnitude<=4.0) return 600;
    if(magnitude>4.0&&magnitude<=5.0) return 1100;
    if(magnitude>5.0&&magnitude<=5.5) return 1500;
    if(magnitude>5.5&&magnitude<=6.0) return 2200;
    if(magnitude>6.0&&magnitude<=6.2) return 2500;
    if(magnitude>6.2&&magnitude<=6.5) return 3200;
    if(magnitude>6.5&&magnitude<=7.0) return 4000;
    if(magnitude>7.0&&magnitude<=7.2) return 5000;
    if(magnitude>7.2&&magnitude<=7.5) return 6000;
    if(magnitude>7.5) return 6500;
}
function formatCountdown(seconds) {
    var minutes = Math.floor(seconds / 60);
    var remainingSeconds = seconds % 60;
    var paddedMinutes = String(minutes).padStart(3, '0');
    var paddedSeconds = String(remainingSeconds).split(".")[0].padStart(2, '0');
    return paddedMinutes + ':' + paddedSeconds;
}
