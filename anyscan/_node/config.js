/**
 * 設定
 */
var _fs = require('fs');
var _path = "./public/configs/config.json";
var _data = null;


/**
 * 初期化処理
 * JSONファイルを取得して設定を更新
 */
module.exports.init = function()
{
	var jsonStr = _fs.readFileSync(_path,"utf8");
	_data = JSON.parse( jsonStr );
	_updateConfig();
};


/**
 * 内部的にJSONデータ更新
 * @private
 */
function _updateConfig()
{
	var sysConf = _data["systemConfigs"];

	module.exports.ID = sysConf["edisonID"];
	module.exports.MY_ADDRESS = sysConf["edisonAddress"];
	module.exports.PC_ADDRESS = sysConf["pcAddress"];
	module.exports.SERVER_PORT = sysConf["fileServerPort"];
	module.exports.OSC_PORT = sysConf["oscPort"];
	module.exports.IS_DEBUGMODE = sysConf["isDebugMode"];
	module.exports.FPS = sysConf["loopFPS"];
}


/**
 * JSONデータを取得する
 */
module.exports.getConfigData = function()
{
	return _data;
};


/**
 * JSONを更新して保存
 */
module.exports.updateConfig = function( confObj )
{
	_data = confObj;
	var jsonStr = JSON.stringify( _data, null, "\t" );

	_fs.writeFileSync( _path, jsonStr );
	_updateConfig();
};
