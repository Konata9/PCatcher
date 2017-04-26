/**
 * pcatcher.js
 * 模拟登陆，获取所需要的cookie
 */

const request = require('superagent');
const cheerio = require('cheerio');
const async = require('async');
// 打包parser
const setCookieParser = require('set-cookie-parser');
const fs = require('fs');

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
   * 从返回的页面信息中整理出需要的图片列表
   * 排除掉gif  ugoku-illust
   * 排除掉漫画  manga
   */
  getImgList(responseData) {
    let imgList = [
      // 数据结构
      // {
      //   'title': 图片的标题
      //   'src': 图片的地址
      //  'star': 图片获得的星数
      // }
    ];

    let $ = cheerio.load(responseData, {
      ignoreWhitespace: true,
      xmlMode: true
    });

    let domImgWrapper = $('.column-search-result .image-item ._work');
    domImgWrapper.each(function (index, element) {
      if (!$(element).hasClass('manga')) {
        if (!$(element).hasClass('ugoku-illust')) {
          let imgData = {
            'title': '',
            'src': '',
            'star': 0
          }

          let imgSrc = $(element).find('img').attr('data-src');
          // 获取图片后缀名
          imgData.title = imgSrc.match(/\/([\d\w_]*\.jpg|png|jpeg)/)[1];
          // 获取原图地址
          imgData.src = imgSrc.replace(/c\/[\dx]*\/img-master/, 'img-original');
          // 获取图片的star数
          let starWrapper = $(element).nextAll('ul').find('a').text();
          if (starWrapper) {
            imgData.star = parseInt(starWrapper);
          }
          imgList.push(imgData);
        }
      }
    });

    return imgList;
  }

  getImg(imgItem, userInfo, callback) {
    
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

    let postData = {
      p_id: 'pixiv_id=' + this.baseInfo.postData.pixiv_id,
      p_pwd: 'password=' + this.baseInfo.postData.password,
      p_captcha: 'captcha=' + this.baseInfo.postData.captcha,
      p_g_re: 'g_recaptcha_response=' + this.baseInfo.postData.g_recaptcha_response,
      p_key: 'post_key=' + this.baseInfo.postData.post_key,
      p_source: 'source=' + this.baseInfo.postData.source,
      p_ref: 'ref=' + this.baseInfo.postData.ref,
      p_return: 'return_to=' + this.baseInfo.postData.return_to
    };

    for (let key in postData) {
      if (key == 'p_pwd' || key == 'p_id') {
        // 不在屏幕上打印错误信息
        console.log(`包装后的post信息 ${key}： [  ******  ]`);
      } else {
        console.log(`包装后的post信息 ${key}： [ ` + postData[key] + ' ]');
      }
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
          console.log('请检查用户名密码是否填写正确');
        }
      });
  }

  /**
   * 对关键词进行搜索
   * 对于第一次访问与后续页面访问处理不同
   * @param {*} callback 
   * @param {*} cuurentPage 
   */
  doSearch(callback, cuurentPage) {
    console.log('====== 准备搜索图片 ======');
    console.log('搜索的关键词 : [' + this.userInfo.keyWord + ' ]');
    this.userInfo.searchConfig.word = this.userInfo.keyWord;

    console.log('====== 正进行查询参数设置 ======');
    for (let key in this.userInfo.searchConfig) {
      console.log(`查询参数设置为${key}: [ ` + this.userInfo.searchConfig[key] + ' ]');
    }

    if (!cuurentPage) {
      // 当为首次访问时，需要获取之后页面的相关信息
      request.get(this.baseInfo.searchURL)
        .set(this.baseInfo.header)
        .query(this.userInfo.searchConfig)
        .end((error, response) => {
          if (!error && response.statusCode == 200) {

            console.log('====== 正在获取图片列表 ======');

            let imgList = this.getImgList(response.text);

            console.log('====== 成功获取图片列表 ======');
            // 控制下载图片的并发数
            async.mapLimit(imgList, this.userInfo.max_async, function (imgItem, callback) {
              this.getImg(imgItem, this.userInfo, callback);
            }, function (err, result) {
              console.log('====== ')
            });

            if (callback) {
              console.log('====== 准备保存图片 ======');
              callback.call(this, pageList);
            }
          } else {
            console.log('====== 发生错误 ======');
            console.log(response);
          }
        });
    } else {

    }
  }

  init() {
    this.getPostKey(function () {
      this.getCookie(function () {
        this.doSearch()
      });
    });
  }
}

module.exports = PCatcher;