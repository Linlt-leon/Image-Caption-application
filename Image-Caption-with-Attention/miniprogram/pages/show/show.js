// pages/show/show.js

//调用插件
const plugin = requirePlugin('WechatSI');
//获取全局唯一的语音识别管理器recordRecoManager
const manager = plugin.getRecordRecognitionManager();

const app = getApp()
Page({

  /**
   * 页面的初始数据
   */
  data: {
    photos: "",
    result: "1",
    result_chi:"2",
    result_chi2:"3",
    tabs:[
      {
        id:0,
        name:"英文",
        isActive:true
      },
      {
        id:1,
        name:"中文1",
        isActive:false
      },
      {
        id:2,
        name:"中文2",
        isActive:false
      }
    ],
    nickName: '',
    avatarUrl: '',
    isCanDraw: false,
    src:'',
  },

  //
  handleItemTap(e){
    const {index}=e.currentTarget.dataset;
    let {tabs}=this.data;
    tabs.forEach((v,i)=>i===index?v.isActive=true:v.isActive=false);
    this.setData({
      tabs
    })
  },
  
  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    //此时A页面传递的参数由options接收，A页面传递参数时的参数名分别叫data1和data2,所以B页面想拿到A页面传递的参数拿对应的参数名即可
    // let data1 = options.data1;
    // let data2 = options.data2;
    // let data3 = options.data3;
    // console.log(data1);
    // console.log(data2);
    // console.log(data3);

    this.setData({
      // photos: data1,
      // result: data2,
      // result_chi: data3,
      photos: app.globalData.photos,
      result: app.globalData.result,
      result_chi: app.globalData.result_chi,
      result_chi2: app.globalData.result_chi2,
      nickName: wx.getStorageSync('nickName') || '',
      avatarUrl: wx.getStorageSync('avatarUrl') || ''
    })
    

  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: function () {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {
    this.text_audio(this.data.result_chi)
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide: function () {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload: function () {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh: function () {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom: function () {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function () {
    // return {
    //   title: this.result,
    //   imageUrl: this.photos
    // };
  },

  handleClose() {
    console.log(this.data.nickName)
    console.log(this.data.avatarUrl)
    this.setData({
      isCanDraw: !this.data.isCanDraw
    })
  },
  getUserInfo(e) {
    if (e.detail.errMsg === 'getUserInfo:ok') {
      wx.setStorageSync('avatarUrl', e.detail.userInfo.avatarUrl)
      wx.setStorageSync('nickName', e.detail.userInfo.nickName)
      this.setData({
        nickName: e.detail.userInfo.nickName,
        avatarUrl: e.detail.userInfo.avatarUrl,
        isCanDraw: !this.data.isCanDraw
      })
    }
  },

  text_audio:function(content){
    if(app.globalData.voice_switch){
      var that = this
      plugin.textToSpeech({
        lang: "zh_CN",//代表中文
        tts: true, //是否对翻译结果进行语音合成，默认为false，不进行语音合成
        content: content,//要转为语音的文字
        success: function (res) {
          
          console.log("succ tts", res);
          that.setData({
            src: res.filename//将文字转为语音后的路径地址
          })
          that.text_audio_status();//调用此方法来监听语音播放情况
        },
        fail: function (res) {
          console.log("fail tts", res)
        }
      })
    }
  },
 //用来监听文字转语音的播放情况
 text_audio_status:function(){
   var that = this
 //判断语音路径是否存在
    if (that.data.src == '') {
       console.log(暂无语音);
       return;
     }
    const innerAudioContext = wx.createInnerAudioContext();//创建音频实例
    innerAudioContext.src = that.data.src; //设置音频地址
    innerAudioContext.play(); //播放音频
    innerAudioContext.onPlay(() => {
       console.log('监听开始播放');
     });
     innerAudioContext.onEnded(() => {
       console.log('监听播报结束，可在结束中进行相应的处理逻辑');
       innerAudioContext.stop();
       //播放停止，销毁该实例,不然会出现多个语音重复执行的情况
       console.log('销毁innerAudioContext实例')
       innerAudioContext.destroy();
     })
     innerAudioContext.onError(() => {
       console.log('监听语音播放异常')
       innerAudioContext.destroy()//销毁播放实例
     })
  }
})
