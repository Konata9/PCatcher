/**
 * 关于request部分的一些基础设定
 */

let BaseInfo = {
  'loginURL': 'https://accounts.pixiv.net/api/login',
  'rootURL': 'https://www.pixiv.net/',
  'serchURL': '',
  // request用头部
  'header': {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Encoding': 'gzip, deflate, sdch, br',
    'Accept-Language': 'zh-CN,zh;q=0.8,zh-TW;q=0.6',
    'Connection': 'keep-alive',
    'Host': 'www.pixiv.net',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/57.0.2987.133 Safari/537.36',
  },
  // post用头部
  'postHeader': {
    'Origin': 'https://accounts.pixiv.net',
    'Referer': 'https://accounts.pixiv.net/login',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/57.0.2987.133 Safari/537.36',
    'X-Requested-With': 'XMLHttpRequest'
  },
  // 登陆用post发送data数据结构
  'postData': {
    'pixiv_id': '',
    'password': '',
    'captcha': '',
    'g_recaptcha_response': '',
    'post_key': '',
    'source': 'pc',
    'ref': 'wwwtop_accounts_index',
    'return_to': 'https://www.pixiv.net/'
  }
};

module.exports = BaseInfo;