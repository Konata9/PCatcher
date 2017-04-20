/**
 * 关于request部分的一些基础设定
 */

let BaseInfo = {
  'loginURL': 'https://accounts.pixiv.net/login?lang=zh&source=pc&view_type=page&ref=wwwtop_accounts_index',
  'rootURL':'https://www.pixiv.net/',
  // request用头部
  'header': {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Encoding': 'gzip, deflate, sdch, br',
    'Accept-Language': 'zh-CN,zh;q=0.8,zh-TW;q=0.6',
    'Connection': 'keep-alive',
    'Host': 'www.pixiv.net',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/57.0.2987.133 Safari/537.36'
  },
  // 登陆用post发送data数据结构
  'postData': {
    'post_key': '',
    'pixiv_id': '',
    'password': '',
    // 设定登陆时的语言显示以及登陆端末种类
    'lang': 'zh',
    'source': 'pc'
  },
  // 登陆成功后用于接收返回的cookie
  'setCookie': ''
};

module.exports = BaseInfo;