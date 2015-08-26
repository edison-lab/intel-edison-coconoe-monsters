var _express	= require("express");
var _osc 		= require("node-osc");
var _process	= require("child_process");
var _config		= require("./config.js");
var _camera		= require("./camera.js");
var _julius		= require("./julius.js");

var _oscClient, _oscServer;
var _app;
var _loopDuration;

// 各種センサーとデバイス
var _CardSensor  = require("./sensors/card_detect_sensor.js");
var _HandSensor  = require("./sensors/ir_distance_sensor.js");
var _NeoPixelLED = require("./led/neopixel.js");

var _fadeCandyServer = null;
var _led = null;
var _cardSensor;
var _handSensor;

var _isRunningCardSensor = false;
var _isRunningHandSensor = false;
var _exitFlag = false;



/**
 * main
 */
module.exports.main = function()
{
	_app = _express();

	//
	// fcserver-galileoの起動
	_fadeCandyServer = _process.spawn( "./_fadecandy/fcserver-galileo" );

	_fadeCandyServer.stdout.on( "data", function( data )
	{
		console.log("[FadeCandyServer.stdout]:" + data );
	});

	// Close時
	_fadeCandyServer.on( "close", function( code )
	{
		console.log( "FadeCandyServer is CLOSE: [code->]" + code );
	});

	_config.init();
	_camera.init();
	_loopDuration = 1000 / _config.FPS;

	_initSensors();
	_initOSC();
	_initServer();

	setTimeout( _mainLoop, _loopDuration );


	// 終了シグナルを見てアプリを終了させる
	var signals = ['SIGINT', 'SIGHUP', 'SIGTERM'];
	for( var i = 0; i < 3; ++i )
	{
		process.on( signals[i], function()
		{
			console.log("app is CLOSING...");

			// FadeCandyの終了前にLED全消し。ダメ。
			// _led.allOff();

			_exitFlag = true;

			setTimeout( function(){
				console.log("[close fade Candy]");
				_fadeCandyServer.kill('SIGINT');
			}, 1000 );


			if( !_exitFlag && _julius != null )
			{
				console.log( ">> close Julius" );
				_julius.stop();
			}


			if( !_exitFlag && _camera != null )
			{
				console.log( ">> close Camera" );
				_camera.stop();
			}

			// 3秒ぐらい待ってから終了させる
			setTimeout( function(){
				console.log("[close node APP]");
				process.exit(1);
			}, 3000 );
		});
	}
};



/**
 * メインループ
 */
function _mainLoop()
{
	if( _exitFlag ) return;

	if( _isRunningCardSensor )
	{
		// カードセンサの値を送る
		_cardSensor.sensing();
		_oscClient.send( "/cardsensor_" + _config.ID, _cardSensor.getValue() );
	}

	if( _isRunningHandSensor )
	{
		// 手かざしセンサの値を送る
		_handSensor.sensing();

		var data = {
			 val00:_handSensor.getValue00()
			,val01:_handSensor.getValue01()
			,val02:_handSensor.getValue02()
			,val03:_handSensor.getValue03()
			,val04:_handSensor.getValue04()
		};
		var jsonStr = JSON.stringify( data );

		_oscClient.send( "/handsensor_" + _config.ID, jsonStr );
	}

	// LEDの更新
	_led.clock();

	setTimeout( _mainLoop, _loopDuration )
}


/**
 * センサ類初期化
 */
function _initSensors()
{
	// 引数はピンの番号
	_handSensor = new _HandSensor( 0, 1, 2, 3, 4 );
	_cardSensor = new _CardSensor( 5 );

	// 16 : 合計個数, 4 : 照明用の個数
	_led = new _NeoPixelLED( 16, 4, _loopDuration );
	_led.allOff();
}


/**
 * OSC接続
 */
function _initOSC()
{
	_oscClient = new _osc.Client( _config.PC_ADDRESS, _config.OSC_PORT );
}


/**
 * サーバー起動
 */
function _initServer()
{
	// staticファイル利用
	_app.use( _express.static("public") );

	// POST利用
	var bodyParser = require("body-parser");
	_app.use( bodyParser.urlencoded({extended: true}) );

	_app.listen( _config.SERVER_PORT );

	_app.get("/check_connection", _checkConnection );
	_app.get("/get_config", _getConfig );

	_app.post("/set_config", _setConfig );
	_app.post("/ctrl_camera", _ctrlCamera );
	_app.post("/ctrl_julius", _ctrlJulius );
	_app.post("/ctrl_card_sensor", _ctrlCardSensor );
	_app.post("/ctrl_hand_sensor", _ctrlHandSensor );
	_app.post("/ctrl_camera_led", _ctrlCameraLED );
	_app.post("/ctrl_txt_led", _ctrlTxtLED );
	_app.post("/ctrl_circle_led", _ctrlCircleLED );
}


/**
 * [ /check_connection ]
 * 接続しているかどうか見て返します。
 */
function _checkConnection( req, res )
{
	res.send( "SUCCESS" );
}


/**
 * [ /get_config ]
 * 設定用のJSONデータを取得して返します。
 */
function _getConfig( req, res )
{
	var jsonStr = JSON.stringify( _config.getConfigData(), null );
	res.send( jsonStr );
}


/**
 * [ /set_config ]
 * カメラ設定用のJSONを更新し、カメラに設定変更を投げる。
 */
function _setConfig( req, res )
{
	var body = req.body;

	_config.updateConfig( JSON.parse( String( body["jsonStr"] ) ) );
	_camera.updateConfig();

	res.send( "SUCCESS" );
}


/**
 * [ /ctrl_camera ]
 * カメラを制御します。
 */
function _ctrlCamera( req, res )
{
	var code = String( req.body["data"] );
	console.log( "ctrlCamera [code]:" + code );

	var msg = "";

	switch ( code )
	{
		case "start":
			msg = _camera.start();
			res.send( msg );
			break;

		case "stop":
			msg = _camera.stop();
			res.send( msg );
			break;

		case "scan":
			msg = _camera.scan( function()
			{
				res.send( "SCAN_COMPLETE" );
			});

			if( msg == "FAILED" ) res.send( "FAILED" );
			break;

		case "scan_debug":
			msg = _camera.scanWithDebug( function()
			{
				res.send( "SCAN_WITH_DEBUG_COMPLETE" );
			});

			if( msg == "FAILED" ) res.send( "FAILED" );
			break;

		default :
			msg = "NO_PARAMS";
			res.send( msg );
			break;
	}
}


/**
 * [/ctrl_julius]
 * 音声認識の開始・停止など
 */
function _ctrlJulius( req, res )
{
	var code = String( req.body["data"] );
	console.log( "ctrlJulius [code]:" + code );

	var codes = code.split("_");
	var msg = "";

	switch ( codes[0] )
	{
		case "start":
			var conf = _config.getConfigData();
			var micConf = conf["micConfigs"];

			msg = _julius.start(
				micConf["cardID"],
				micConf["subDeviceID"],
				micConf["lv"],
				micConf["rejectShort"],
				codes[1],
				_onDetectWordsHandler
			);

			res.send( msg );
			break;

		case "stop":
			msg = _julius.stop();
			res.send( msg );
			break;

		default :
			res.send( "NO_PARAMS" );
			break;
	}
}


/**
 * Juliusの音声認識後に実行されるイベントハンドラ
 */
function _onDetectWordsHandler( data )
{
	// console.log( "[" + _config.ID + "]DETECT Words:" + data );

	// 長すぎる出力が来たら無視...
	if( data.length < 1000 )
	{
		try
		{
			_oscClient.send( "/julius_" + _config.ID, String(data));
		}
		catch(err)
		{
			console.log("[Error!] onDetectWordHandler");
		}
	}
	else
	{
		console.log("output is TOO LONG");
	}
}


/**
 * [/ctrl_card_sensor]
 * カードセンサの制御
 */
function _ctrlCardSensor( req, res )
{
	var code = String( req.body["data"] );

	console.log( "ctrlCardSensor [code]:" + code );

	switch ( code ) {
		case "start":
			_isRunningCardSensor = true;
			res.send( "CARD_SENSOR_ON" );
			break;

		case "stop":
			_isRunningCardSensor = false;
			res.send( "CARD_SENSOR_OFF" );
			break;

		default :
			res.send( "NO_PARAMS" );
			break;
	}
}


/**
 * [/ctrl_hand_sensor]
 * 手かざしセンサの制御
 */
function _ctrlHandSensor( req, res )
{
	var code = String( req.body["data"] );

	console.log( "ctrlHandSensor [code]:" + code );

	switch ( code ) {
		case "start":
			_isRunningHandSensor = true;
			res.send( "HAND_SENSOR_ON" );
			break;

		case "stop":
			_isRunningHandSensor = false;
			res.send( "HAND_SENSOR_OFF" );
			break;

		default :
			res.send( "NO_PARAMS" );
			break;
	}
}


/**
 * [/ctrl_camera_led]
 * カメラ照明用LEDの制御
 */
function _ctrlCameraLED( req, res )
{
	var code = String( req.body["data"] );
	console.log( "LED_CTRL:" + code );
	var order = JSON.parse( code );

	var r = order["r"];
	var g = order["g"];
	var b = order["b"];
	var brightnessList = order["brightness"];

	if( r != null && g != null && b != null && brightnessList != null )
	{
		console.log( "[CAMERA LED] > R:" + r, "G:" + g, "B:" + b, "brightness:" + brightnessList );
		_led.controlCamPixelRgb( 0, r, g, b, brightnessList[0], 0.5 );
		_led.controlCamPixelRgb( 1, r, g, b, brightnessList[1], 0.5 );
		_led.controlCamPixelRgb( 2, r, g, b, brightnessList[2], 0.5 );
		_led.controlCamPixelRgb( 3, r, g, b, brightnessList[3], 0.5 );
	}

	res.send( "ok" );
}


/**
 * [/ctrl_txt_led]
 * 文字用LEDの制御
 */
function _ctrlTxtLED( req, res )
{
	var code = String( req.body["data"] );
	var order = JSON.parse( code );

	var pxList = order["list"];
	var duration = order["duration"];

	if( pxList != null && duration != null )
	{
		for( var i = 0, len = 4; i < len; ++i )
		{
			var px = pxList[i];
			_led.controlPixel( px["index"], px["h"], px["s"], px["v"], duration );
		}
	}

	res.send( "ok" );
}



/**
 * [/ctrl_circle_led]
 * 魔法陣用LEDの制御
 */
function _ctrlCircleLED( req, res )
{
	var code = String( req.body["data"] );
	var order = JSON.parse( code );

	var pxList = order["list"];
	var duration = order["duration"];

	if( pxList != null && duration != null )
	{
		for( var i = 0, len = 8; i < len; ++i )
		{
			var px = pxList[i];
			_led.controlPixel( px["index"], px["h"], px["s"], px["v"], duration );
		}
	}

	res.send( "ok" );
}
