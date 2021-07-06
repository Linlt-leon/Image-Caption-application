// components/shareBox/shareBox.js

// 海报
Component({
  properties: {
    //属性值可以在组件使用时指定
    isCanDraw: {
      type: Boolean,
      value: false,
      observer(newVal, oldVal) {
        newVal && this.drawPic()
      }
    },
    imgPath:String,
    result:String,
    result_chi:String
  },
  data: {
    imgDraw: {}, //绘制图片的大对象
    sharePath: '', //生成的分享图
    visible: false
  },
  methods: {
    handleClose() {
      this.setData({
        visible: false
      })
      this.triggerEvent('close')
    },
    drawPic() {
      // console.log(this.data)
      if (this.data.sharePath) { //如果已经绘制过了本地保存有图片不需要重新绘制
        this.setData({
          visible: true
        })
        this.triggerEvent('initData') 
        return
      }
      wx.showLoading({
        title: '生成中'
      })
      this.setData({
        imgDraw: {
          width: '750rpx',
          height: '1334rpx',
          background: 'https://z3.ax1x.com/2021/06/28/RNPLPP.jpg',
          views: [
            {
              type: 'image',
              // url: 'https://qiniu-image.qtshe.com/1560248372315_467.jpg',
              url:this.data.imgPath,
              css: {
                top: '32rpx',
                left: '30rpx',
                right: '32rpx',
                width: '688rpx',
                height: '420rpx',
                borderRadius: '16rpx'
              },
            },
            {
              type: 'image',
              // url: wx.getStorageSync('avatarUrl') || 'https://qiniu-image.qtshe.com/default-avatar20170707.png',
              url: wx.getStorageSync('avatarUrl'), 
              css: {
                top: '404rpx',
                left: '328rpx',
                width: '96rpx',
                height: '96rpx',
                borderWidth: '6rpx',
                borderColor: '#FFF',
                borderRadius: '96rpx'
              }
            },
            {
              type: 'text',
              // text: wx.getStorageSync('nickName') || '青团子',
              text: wx.getStorageSync('nickName'),
              css: {
                top: '532rpx',
                fontSize: '28rpx',
                left: '375rpx',
                align: 'center',
                color: '#3c3c3c'
              }
            },
            // {
            //   type: 'text',
            //   text: `邀请您参与助力活动`,
            //   css: {
            //     top: '576rpx',
            //     left: '375rpx',
            //     align: 'center',
            //     fontSize: '28rpx',
            //     color: '#3c3c3c'
            //   }
            // },
            //英文文本
            {
              type: 'text',
              text: this.data.result.slice(0,24).concat(this.data.result.charAt(24)==" "|this.data.result.charAt(23)==" "?"":"-"),
              css: {
                top: '644rpx',
                left: '375rpx',
                maxLines: 1,
                align: 'center',
                fontWeight: 'bold',
                fontSize: '44rpx',
                color: '#3c3c3c'
              }
            },
            {
              type: 'text',
              text: this.data.result.slice(24),
              css: {
                top: '704rpx',
                left: '375rpx',
                maxLines: 1,
                align: 'center',
                fontWeight: 'bold',
                fontSize: '44rpx',
                color: '#3c3c3c'
              }
            },
            //中文文本
            {
              type: 'text',
              text: this.data.result_chi.slice(0,12),
              css: {
                top: '804rpx',
                left: '375rpx',
                maxLines: 1,
                align: 'center',
                fontWeight: 'bold',
                fontSize: '44rpx',
                color: '#3c3c3c'
              }
            },
            {
              type: 'text',
              text: this.data.result_chi.slice(12),
              css: {
                top: '864rpx',
                left: '375rpx',
                maxLines: 1,
                align: 'center',
                fontWeight: 'bold',
                fontSize: '44rpx',
                color: '#3c3c3c'
              }
            },
            // {
            //   type: 'text',
            //   // text: `宇宙最萌蓝牙耳机测评员`,
            //   text: this.data.result.slice(20),
            //   css: {
            //     top: '644rpx',
            //     left: '375rpx',
            //     maxLines: 1,
            //     align: 'center',
            //     fontWeight: 'bold',
            //     fontSize: '44rpx',
            //     color: '#3c3c3c'
            //   }
            // },

            //二维码图标
            {
              type: 'image',
              url: 'https://z3.ax1x.com/2021/07/03/RRpM1U.jpg',
              css: {
                top: '1034rpx',
                left: '375rpx',
                width: '200rpx',
                height: '200rpx',
                align: 'center',
              }
            }
          ]
        }
      })
    },
    onImgErr(e) {
      wx.hideLoading()
      wx.showToast({
        title: '生成分享图失败，请刷新页面重试'
      })
    },
    onImgOK(e) {
      wx.hideLoading()
      this.setData({
        sharePath: e.detail.path,
        visible: true,
      })
      //通知外部绘制完成，重置isCanDraw为false
      this.triggerEvent('initData') 
    },
    preventDefault() { },
    // 保存图片
    handleSavePhoto() {
      wx.showLoading({
        title: '正在保存...',
        mask: true
      })
      wx.saveImageToPhotosAlbum({
        filePath: this.data.sharePath,
        success: () => {
          wx.showToast({
            title: '保存成功'
          })
          setTimeout(() => {
            this.setData({
              visible: false
            })
            this.triggerEvent('close')
          }, 300)
        },
        fail: () => {
          wx.getSetting({
            success: res => {
              let authSetting = res.authSetting
              if (!authSetting['scope.writePhotosAlbum']) {
                wx.showModal({
                  title: '提示',
                  content: '您未开启保存图片到相册的权限，请点击确定去开启权限！',
                  success(res) {
                    if (res.confirm) {
                      wx.openSetting()
                    }
                  }
                })
              }
            }
          })
          setTimeout(() => {
            wx.hideLoading()
            this.setData({
              visible: false
            })
            this.triggerEvent('close')
          }, 300)
        }
      })
    }
  }
})

