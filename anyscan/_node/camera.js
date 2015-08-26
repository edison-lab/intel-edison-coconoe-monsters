/**
 * カメラ制御用JS
 */
var _process	= require("child_process");
var _exec		= _process.exec;
var _spawn		= _process.spawn;
var _cvApp = null;
var _running = false;
var _scanCompleteHandler = null;

// スキャンフラグ
var _scanFlag = false;
var _scanWithDebugFlag = false;

// 設定更新フラグ
var _updateConfigFlag = false;

// 終了フラグ
var _quitFlag = false;



/**
 * カメラ設定更新用のコマンドを叩く
 * @param propName	カメラの設定用プロパティ名
 * @param value		数値
 */
function _setCameraConf( propName, value )
{
	var command = "v4l2-ctl --set-ctrl=" + propName + "=" + value;
	console.log( "_setCameraConf => " + command );
	var c = _exec( command, function( err, stdout, stderr )
	{
		if( err ) {
			console.log("_setCameraConf:Error!" + err.message );
		}
	});
}


/**
 * カメラを初期化
 * ※オートホワイトバランス・オートフォーカスなどを切る
 */
module.exports.init = function()
{
	_setCameraConf( "white_balance_temperature_auto", 0 );
    _setCameraConf( "focus_auto", 0 );
    _setCameraConf( "exposure_auto", 1 );
    _setCameraConf( "exposure_auto_priority", 0 );
};


/**
 * カメラを起動する
 */
module.exports.start = function()
{
	if( _running )
	{
		console.log( "camera is already running!");
		return "FAILED";
	}

	console.log( "start camera...");
	_running = true;

	// アプリ起動
	var appCommand = "./app";
	var cwd = { cwd:"/home/root/anyscan/_opencv" };

	_cvApp = _spawn( appCommand, [], cwd );

	// std::outの検知時に実行
	_cvApp.stdout.on( "data", function( data )
	{
		var str = String( data );

		if( str.search("input_cin") != -1 )
		{
			if( _quitFlag )
			{
				_cvApp.stdin.write( "quit\n");
				_quitFlag = false;
				_running = false;

			}
			else if( _updateConfigFlag )
			{
				console.log("updateConfig...");

				_cvApp.stdin.write( "updateConfig\n");
				_updateConfigFlag = false;
			}
			else if( _scanWithDebugFlag )
			{
				console.log("scan with debug...");

				_cvApp.stdin.write( "scan_debug\n");
				_scanWithDebugFlag = false;
			}
			else if( _scanFlag )
			{
				console.log("scan...");

				_cvApp.stdin.write( "scan\n");
				_scanFlag = false;
			}
			else
			{
				_cvApp.stdin.write( "ignore\n");
			}
		}
		else if(  str.search("captured") != -1 )
		{
			if( _scanCompleteHandler != null )
			{
				console.log( "Scan Complete!" );
				_scanCompleteHandler();
				_scanCompleteHandler = null;
			}
		}
	});


	// Close時
	_cvApp.on( "close", function( code )
	{
		console.log( "Camera App is CLOSE: [code->]" + code );
		_running = false;
		_cvApp = null;
	});

	return "SUCCESS";
};


/**
 * カメラ撮影
 */
module.exports.scan = function( onComplete )
{
	if( !_running )
	{
		console.log( "camera is NOT running!" );
		return "FAILED";
	}

	console.log( "START SCAN please wait..." );
	_scanCompleteHandler = onComplete;

	_scanFlag = true;
};


/**
 * カメラ撮影
 */
module.exports.scanWithDebug = function( onComplete )
{
	if( !_running )
	{
		console.log( "camera is NOT running!" );
		return "FAILED";
	}

	console.log( "START SCAN with Debug please wait..." );
	_scanCompleteHandler = onComplete;

	_scanWithDebugFlag = true;
};





/**
 * カメラ情報の更新フラグを立てる
 */
module.exports.updateConfig = function()
{
	if( !_running )
	{
		console.log( "camera is NOT running!" );
		return;
	}

	console.log( "UPDATE CONFIG please wait..." );
	_updateConfigFlag = true;
};


/**
 * カメラ撮影終了
 */
module.exports.stop = function()
{
	if( !_running )
	{
		console.log( "camera is NOT running!" );
		return "FAILED";
	}

	console.log( "CLOSE CAMERA please wait..." );
	_quitFlag = true;

	return "SUCCESS";
};


/**
 * カメラが起動中かどうかを取得
 * @returns {boolean}
 */
module.exports.isRunning = function(){
	return _running;
};