/**
 * pcatcher.js
 * 模拟登陆，获取所需要的cookie
 */

const request = require('superagent');
const cheerio = require('cheerio');
const async = require('async');
// 打包parser
const setCookieParser = require('set-cookie-parser');
const path = require('path');
const fs = require('fs');

class PCatcher {
  constructor(userInfo, baseInfo) {
    // 引入config文件中设置的参数
    this.userInfo = userInfo;
    this.baseInfo = baseInfo;
    // 记录下载图片的数量
    this.imgCount = 0;
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
  getImgList(responseData, _callback) {
    let imgList = [
      // 数据结构
      // {
      //   'id': 图片的id
      //   'href': 图片的地址
      // }
    ];

    // 存放原图地址列表
    let imgSrcList = [];

    let $ = cheerio.load(responseData, {
      ignoreWhitespace: true,
      xmlMode: true
    });

    let domImgWrapper = $('.column-search-result .image-item ._work');
    domImgWrapper.each((index, element) => {
      if (!$(element).hasClass('manga')) {
        if (!$(element).hasClass('ugoku-illust')) {
          let imgData = {
            'id': 0,
            'href': ''
          }

          // 获取收藏的星数
          let bookMark = parseInt($(element).nextAll('.count-list').find('a').text());
          console.log(`该图收藏数为: ${bookMark} `);

          let imgSrc = $(element).find('img').attr('data-src');
          // 图片id
          imgData.id = $(element).find('img').attr('data-id');
          // 获取原图所在页面
          // 多张图与单张图之间url是有差别的
          let imgHref = $(element).attr('href');
          if ($(element).hasClass('multiple')) {
            imgData.href = this.baseInfo.rootURL + imgHref.replace(/medium/, 'manga');
          } else {
            imgData.href = this.baseInfo.rootURL + imgHref;
          }

          if (bookMark >= this.userInfo.bookMarker) {
            imgList.push(imgData);
          }
        }
      }
    });

    async.mapLimit(imgList, this.userInfo.max_async, (imgItem, callback) => {
      request.get(imgItem.href)
        .set(this.baseInfo.header)
        .end((error, response) => {
          if (!error && response.statusCode == 200) {
            // console.log("====== 准备获取原图路径 ======");
            let $ = cheerio.load(response.text);

            if ($('._illust_modal').length) {
              imgSrcList.push($('._illust_modal .wrapper .original-image').attr('data-src'));
            } else {
              let domImgSrc = $('.manga .item-container img');
              $(domImgSrc).each((index, element) => {
                imgSrcList.push($(element).attr('data-src'));
              });
            }
            callback(null, imgItem);
          }
        });
    }, (error, result) => {
      console.log('====== 原图链接列表完成 ======');
      // console.log(imgSrcList);
      _callback.call(this, imgSrcList);
    });
  }

  /**
   * 储存图片
   * @param {*} imgItem  图片对象 
   * @param {*} userInfo  用户相关设置
   * @param {*} baseInfo 请求相关设置
   * @param {*} callback  用来控制async的回调函数
   */
  getImg(imgSrc, callback) {
    let filePath = this.userInfo.filePath + this.userInfo.keyWord;
    if (!fs.existsSync(filePath)) {
      console.log('====== 文件夹不存在 创建目标文件夹 ======');
      console.log(filePath);
      fs.mkdirSync(filePath);
    }

    // 针对防止盗链，需要设置临时的referer
    // 当原图为png格式时，无法从搜索页推出真实地址，因此都从对应页面获取真实地址

    if (this.imgCount < this.userInfo.maxPicture) {
      request.get(imgSrc)
        .set('referer', this.baseInfo.rootURL)
        .end((error, response) => {
          if (!error && response.statusCode == 200) {
            console.log(imgSrc);
            let imgTitle = imgSrc.match(/\/([\d\w_]*\.(jpg|png))/)[1];
            let writeStream = fs.createWriteStream(filePath + '/' + imgTitle);
            writeStream.write(response.body);
            console.log(`====== 图片 ${imgTitle}  第 ${this.imgCount} 张成功下载 ======`);
            this.imgCount++;

            callback(null, imgSrc);
          }
        });
    } else {
      console.log("====== 目标下载数以到达 ======");
    }
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
  doSearch(cuurentPage) {
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
            let $ = cheerio.load(response.text);

            this.getImgList(response.text, (imgSrcList) => {
              async.mapLimit(imgSrcList, this.userInfo.max_async, (imgSrc, callback) => {
                this.getImg(imgSrc, callback);
              }, (error, result) => {
                console.log('====== 当前页下载完成，准备下载下一页 ====== ');
                let nextPageDOM = $('.pager-container .page-list .current').next('li');
                if (nextPageDOM.length > 0) {
                  let nextPageURL = nextPageDOM.find('a').attr('href');
                  console.log(nextPageURL);
                  this.doSearch(this.baseInfo.searchURL + nextPageURL);
                } else {
                  console.log('====== 已无后续页面 ======');
                }
              });
            });
          } else {
            console.log('====== 发生错误 ======');
            console.log(response);
          }
        });
    } else {
      // 当下载后续页面时
      request.get(cuurentPage)
        .set(this.baseInfo.header)
        .end((error, response) => {
          if (!error && response.statusCode == 200) {

            console.log('====== 正在获取图片列表 ======');
            let $ = cheerio.load(response.text);

            this.getImgList(response.text, (imgSrcList) => {
              async.mapLimit(imgSrcList, this.userInfo.max_async, (imgSrc, callback) => {
                this.getImg(imgSrc, callback);
              }, (error, result) => {
                console.log('====== 当前页下载完成，准备下载下一页 ====== ');
                let nextPageDOM = $('.pager-container .page-list .current').next('li');
                if (nextPageDOM.length > 0) {
                  let nextPageURL = nextPageDOM.find('a').attr('href');
                  this.doSearch(this.baseInfo.searchURL + nextPageURL);
                } else {
                  console.log('====== 已无后续页面 ======');
                }
              });
            });
          } else {
            console.log('====== 发生错误 ======');
            console.log(response);
          }
        });
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