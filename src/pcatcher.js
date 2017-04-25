/**
 * login.js
 * 模拟登陆，获取所需要的cookie
 */

const request = require('superagent');
const cheerio = require('cheerio');
const fs = require('fs');

// 打包parser
const setCookieParser = require('set-cookie-parser');

class PCatcher {
  constructor(userInfo, baseInfo) {
    // 引入config文件中设置的参数
    this.userInfo = userInfo;
    this.baseInfo = baseInfo;
  }

  /**
   * 利用set-cookie-parser进行cookie打包
   */
  cookieParser(responseCookie) {
    let cookies = setCookieParser(responseCookie);
    return cookies.map((ele) => {
      // 模板字符串
      return `${ele.name}=${ele.value}`;
    }).join(';');
  }

  /**
   * 获取P站的post_key，为登陆做准备
   * 首先请求登陆页
   */
  getPostKey(callback) {
    request.get(this.baseInfo.rootURL)
      .set(this.baseInfo.header)
      .end((error, response) => {
        if (!error && response.statusCode == 200) {
          console.log('====== 请求成功 获取post_key中 ======');

          let matches = response.text.match(/pixiv\.context\.token(.*)=(.*?)(\"|\')(.*?)(\"|\')/);
          let postKey = matches[4];

          console.log('获取到的post_key为： [ ' + postKey + ' ]');

          this.baseInfo.postData.post_key = postKey;

          console.log('====== 获取登陆前cookie中 ======');
          console.log('获取到的cookie为： [' + response.header['set-cookie'] + ' ]');

          // 包装登录前的cookie
          let cookie_before = this.cookieParser(response.header['set-cookie']);

          console.log('包装后的cookie为： ' + cookie_before);
          this.baseInfo.postHeader.Cookie = cookie_before;

          if (callback) {
            console.log('====== 准备进行模拟登陆 ======');
            callback.call(this);
          }

        } else {
          console.log('请求失败，返回的状态码为：' + response.statusCode);
        }
      });
  }

  /**
   * 模拟登陆，获取登陆成功后的cookie，为之后抓取图片做准备
   */
  getCookie(callback) {
    //设置登陆信息
    this.baseInfo.postData.pixiv_id = this.userInfo.username;
    this.baseInfo.postData.password = this.userInfo.password;

    console.log('====== 进行post信息包装 ======');

    let postData = {};
    postData.p_id = 'pixiv_id=' + this.baseInfo.postData.pixiv_id;
    postData.p_pwd = 'password=' + this.baseInfo.postData.password;
    postData.p_captcha = 'captcha=' + this.baseInfo.postData.captcha;
    postData.p_g_re = 'g_recaptcha_response=' + this.baseInfo.postData.g_recaptcha_response;
    postData.p_key = 'post_key=' + this.baseInfo.postData.post_key;
    postData.p_source = 'source=' + this.baseInfo.postData.source;
    postData.p_ref = 'ref=' + this.baseInfo.postData.ref;
    postData.p_return = 'return_to=' + this.baseInfo.postData.return_to;

    for (let key in postData) {
      console.log(`包装后的post信息 ${key}： [ ` + postData[key] + ' ]');
    }

    request.post(this.baseInfo.loginURL)
      .set('content-type', 'application/x-www-form-urlencoded')
      .set(this.baseInfo.postHeader)
      .send(postData.p_id)
      .send(postData.p_pwd)
      .send(postData.p_captcha)
      .send(postData.p_g_re)
      .send(postData.p_key)
      .send(postData.p_source)
      .send(postData.p_ref)
      .send(postData.p_return)
      .end((error, response) => {
        if (!error && response.statusCode == 200) {
          console.log('====== 登陆成功，获取登陆后cookie ======');
          console.log('获取到的cookie为： [' + response.header['set-cookie'] + ' ]');

          // 包裝登陸成功后的cookie
          let cookie_login = this.cookieParser(response.headers['set-cookie']);

          console.log('登陆成功后的cookie为 : [' + cookie_login + ' ]');
          console.log('程序执行完成前，将持续使用该cookie');

          this.baseInfo.header.Cookie = cookie_login;

          for (let key in this.baseInfo.header) {
            console.log(`请求发送的header  ${key} : [` + this.baseInfo.header[key] + ' ]');
          }

          if (callback) {
            console.log('====== 准备获取图片 ======');
            callback.call(this);
          }

        } else {
          console.log('====== 发生错误 ======');
          console.log(response.statusCode);
        }
      });
  }

  doSearch(callback) {
    console.log('====== 准备搜索图片 ======');
    console.log('搜索的关键词 : [' + this.userInfo.keyWord + ' ]');

    
  }

  loginStart() {
    this.getPostKey(function () {
      this.getCookie(this.doSearch);
    });
  }
}

module.exports = PCatcher;