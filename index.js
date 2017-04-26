/**
 * 整个抓取程序的主入口
 */


const PCatcher = require('./src/pcatcher');

// 引入配置文件
let UserInfo = require('./config/user_info');
let BaseInfo = require('./config/base_info');

let cather = new PCatcher(UserInfo, BaseInfo);

cather.init();