// index.js
// 获取应用实例
const app = getApp()

Page({
  data: {
    photos: "",
    result: "1",
    result_chi:"2",
    result_chi2:"3",
  },

   /**
   * 选择照片
   */
  chooseImg: function() {
    var that = this
    wx.chooseImage({
      count: 1, // 默认9
      sizeType: ['original', 'compressed'], // 可以指定是原图还是压缩图，默认二者都有
      sourceType: ['album', 'camera'], // 可以指定来源是相册还是相机，默认二者都有
      success: (res) => {
        wx.showToast({title: '加载中', icon: 'loading', duration: 40000}) //加载

        // 返回选定照片的本地文件路径列表，tempFilePath可以作为img标签的src属性显示图片
        var tempFilePaths = res.tempFilePaths
        that.setData({
          photos: tempFilePaths
        })
        console.log(that.data.photos)
        app.globalData.photos = res.tempFilePaths
        
        //上传照片
        wx.uploadFile({
          // url: 'http://172.18.242.63:1198/image_caption_predict', 
          url: 'http://cn-sc1.frp.cool:19150/image_caption_predict', 
          method: "POST",
          filePath: that.data.photos[0],
          name: 'file',
          success: function (respose) {
            var prediction = JSON.parse(respose.data);
            console.log(prediction);
            console.log(prediction["predictions"]);
            that.setData({
              result:prediction["predictions"],
              result_chi:prediction["predictions_chi"]
            })
            app.globalData.result = prediction["predictions"]
            app.globalData.result_chi = prediction["predictions_chi"]

            //传参给下个页面并跳转
            wx.redirectTo({
              url: '/pages/show/show?data1=' + that.data.photos + '&data2=' + that.data.result  + '&data3=' + that.data.result_chi
              //这个就是我们平时对接接口传递参数的方式了 使用第一个使用 ? 号 之后的使用 &  拼接
            })

          },
          fail: () => {
            wx.showToast({
              title: '服务器维护中...请稍后尝试',
              icon: 'none',
              duration: 1500
            })
          }
        })

        //上传照片2
        wx.uploadFile({
          url: 'http://cn-sc1.frp.cool:19151/image_caption_predict2', 
          method: "POST",
          filePath: that.data.photos[0],
          name: 'file',
          success: function (respose) {
            var prediction = JSON.parse(respose.data);
            console.log(prediction["predictions_chi"]);
            that.setData({
              result_chi2:prediction["predictions_chi"]
            })
            app.globalData.result_chi2 = prediction["predictions_chi"]
          },
          fail: () => {}
        })
      },
      fail: () => {
        wx.showToast({
          title: '出错了！请稍后尝试',
          icon: 'none',
          duration: 1500
        })
      },
      complete: () => {
        // wx.redirectTo({
        //   url: '/pages/show/show',
        // })
        wx.hideToast()
      }
    })
  },
  
  // 事件处理函数
  bindViewTap() {
    wx.navigateTo({
      url: '../logs/logs'
    })
  },
  onLoad() {
    if (wx.getUserProfile) {
      this.setData({
        canIUseGetUserProfile: true
      })
    }
  },
  getUserProfile(e) {
    // 推荐使用wx.getUserProfile获取用户信息，开发者每次通过该接口获取用户个人信息均需用户确认，开发者妥善保管用户快速填写的头像昵称，避免重复弹窗
    wx.getUserProfile({
      desc: '展示用户信息', // 声明获取用户个人信息后的用途，后续会展示在弹窗中，请谨慎填写
      success: (res) => {
        console.log(res)
        this.setData({
          userInfo: res.userInfo,
          hasUserInfo: true
        })
      }
    })
  },
  getUserInfo(e) {
    // 不推荐使用getUserInfo获取用户信息，预计自2021年4月13日起，getUserInfo将不再弹出弹窗，并直接返回匿名的用户个人信息
    console.log(e)
    this.setData({
      userInfo: e.detail.userInfo,
      hasUserInfo: true
    })
  }
})
