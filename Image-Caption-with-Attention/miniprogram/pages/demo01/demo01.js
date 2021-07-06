// pages/demo01/demo01.js
Page({

  /**
   * 页面的初始数据
   */
  data: {
    photos: "",
    result: "",
    result_chi:"",

    tabs:[
      {
        id:0,
        name:"英文",
        isActive:true
      },
      {
        id:1,
        name:"中文",
        isActive:false
      }
    ]
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
      success: function (res) {
        // 返回选定照片的本地文件路径列表，tempFilePath可以作为img标签的src属性显示图片
        var tempFilePaths = res.tempFilePaths
        that.setData({
          photos: tempFilePaths
        })
        console.log(that.data.photos)
      }
    })
  },

    /**
   * 上传照片
   */
  uploadImg: function() {
    var that = this;
    // var image = wx.getFileSystemManager().readFileSync(that.data.photos[0]) 
    wx.uploadFile({
      // url: 'http://172.18.242.63:1198/image_caption_predict', 
      url: 'http://cn-sc1.frp.cool:19150/image_caption_predict', 
      method: "POST",
      filePath: that.data.photos[0],
      name: 'file',
      success: function (respose) {
        var prediction = JSON.parse(respose.data);
        console.log(prediction);
        // console.log(prediction["predictions"]);
        that.setData({
          result:prediction["predictions"],
          result_chi:prediction["predictions_chi"]
        })
      }
    })
    // wx.request({
    //   url: "http://172.18.242.63:1198/image_caption_predict",
    //   method: "POST",
    //   data: {image},
    //   success: function (respose) {
    //     var prediction = respose.data;
    //     console.log(prediction);
    //   }
    // });
  },

  //
  handleItemTap(e){
    const {index}=e.currentTarget.dataset;
    let {tabs}=this.data;
    tabs.forEach((v,i)=>i===index?v.isActive=true:v.isActive=false);
    this.setData({
      tabs
    })
  }

})