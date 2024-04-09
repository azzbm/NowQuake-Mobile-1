function toggleFullScreen() {
    if (!document.fullscreenElement) {
        // 进入全屏
        document.documentElement.requestFullscreen();
    } else {
        // 退出全屏
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
}// 监听全屏变化事件
document.addEventListener('fullscreenchange', function () {
    if (document.fullscreenElement) {
        document.getElementById('tool-togglescreen').innerHTML = '<img src="./resource/icos/minimize.svg">'
    } else {
        document.getElementById('tool-togglescreen').innerHTML = '<img src="./resource/icos/maximize.svg">'
    }
});// 获取当前页面的缩放比例
function getZoom() {
    return parseFloat(document.body.style.zoom) || 1;
  }// 设置页面的缩放比例
function setZoom(zoom) {
    document.body.style.zoom = zoom;
}// 页面放大函数
function zoomIn() {
    var zoom = getZoom();
    setZoom(zoom + 0.1);
}// 页面缩小函数
function zoomOut() {
    var zoom = getZoom();
    if (zoom > 0.2) {
      setZoom(zoom - 0.1);
    }
}
function tool_tohome(){
    jump_to(home_location.lat,home_location.lon,6.5);
}
function tool_tofitview(){
    jump_to(33.4131,110.144206,4.6);
}
function showsetting(){
    document.getElementById('settinglayer').style.display='flex';
}
function hidesetting(){
    document.getElementById('settinglayer').style.display='none';
}
function savesetting(){
    let lat=document.getElementById('mylocation-latitude').value;
    let lon=document.getElementById('mylocation-longitude').value;
    sethome(lat,lon);
    hidesetting();
}
