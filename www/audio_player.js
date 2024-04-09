// 创建一个音频播放器对象
const audioPlayer = {
    currentAudio: null, // 当前正在播放的音频对象
    currentWeight: 0,   // 当前正在播放的音频权重
  
    // 播放音频方法
    playAudio: function(filename, weight) {
      // 如果当前没有音频播放或者传入的权重大于当前正在播放的音频权重
      if (!this.currentAudio || weight >= this.currentWeight) {
        // 停止当前播放的音频（如果有的话）
        if (this.currentAudio) {
          this.currentAudio.pause();
        }
        
        // 创建新的音频对象
        this.currentAudio = new Audio(`./resource/sounds/${filename}`);
        this.currentWeight = weight;
  
        // 播放新的音频
        this.currentAudio.play();
      }
    }
  };
  
  // 示例用法
//   audioPlayer.playAudio('example1.mp3', 5);