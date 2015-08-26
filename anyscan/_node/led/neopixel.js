var OPC = new require('./opc');
var client = new OPC('localhost', 7890);

/**********************************************
 * NeoPixelLEDを光らすためのモジュール
 * ・clock()をsetInterval()にセットしてください。
 * ・コンストラクタの第三引数には呼び出し元のsetIntervalのdelayをセットして下さい。
 * ・カメラ用照明LEDの制御はControlCamLight()を使用して下さい。
 * ・演出用LEDの制御はControlDirection()を使用して下さい。
 * ・LEDの個別制御はcontrolPixel()を使用して下さい。
 **********************************************/


/*
	プロパティ
*/
//
// ピクセル(LED)の全体個数
var _ledTotalNum = 10;

//
// 演出に使うピクセル
var _ledDirectionNum = 0;

//
// カメラ照明に使うピクセル
var _ledCamNum = 4;

//
// このモジュールの定義元のdelay
var _setIntervalDelay = 1000 / 30;

//
// 各LEDピクセルの現在の情報
var _pixelsInfo = [];

//
// 各LEDピクセルの変化量
var _pixelsValiation = [];

//
// 各LEDピクセルの目標値
var _pixelsTarget = [];


/*
	コンストラクタ
	pixelTotalNum 		[int]: 使用するLEDの全体個数。
	pixelCamNum 		[int]: カメラ照明に使うピクセル個数。LEDテープの後ろから数えた個数がカメラ照明用にあたる。
	setIntervalDelay 	[int]: 親クラスで定義するsetIntervalの第二引数delayをセット。
*/
var NeopixelLED = function(pixelTotalNum, pixelCamNum, setIntervalDelay)
{
	if (pixelTotalNum != null) _ledTotalNum = pixelTotalNum;
	if (pixelCamNum != null)
	{
		_ledCamNum = pixelCamNum;
		_ledDirectionNum = _ledTotalNum - _ledCamNum;
	}
	if (setIntervalDelay != null) _setIntervalDelay = setIntervalDelay;

	//
	// LED情報格納用配列を初期化
	for ( var i = 0, len = _ledTotalNum; i < len; ++i )
	{
		//
		// RGBで保持
		_pixelsInfo[i] = [0, 0, 0];
		_pixelsValiation[i] = [0, 0, 0];
		_pixelsTarget[i] = [0, 0, 0];
	}
};


/*
	処理
	※ setInterval()にセットしてください。推奨:30fps
*/
NeopixelLED.prototype.clock = function()
{
	//
	// 処理
	pixelsProcessClock();
};


/*
	ピクセルフレーム処理
*/
function pixelsProcessClock()
{
	//
	// 各LEDピクセルを回って処理
	for ( var i = 0, len = _ledTotalNum; i < len; ++i )
	{
		//
		// 変化量を加算
		for ( var j = 0, len_j = 3; j < len_j; ++j )
			_pixelsInfo[i][j] += _pixelsValiation[i][j];

		//
		// LEDに反映
		client.setPixel( i, _pixelsInfo[i][0], _pixelsInfo[i][1], _pixelsInfo[i][2] );
		client.writePixels();

		//
		// 加算後の値をみて目標値に達していれば処理を止める(変化量を0に)
		if ( _pixelsValiation[i][0] > 0 )
		{
			if ( _pixelsInfo[i][0] > _pixelsTarget[i][0] )
				_pixelsValiation[i] = [0, 0, 0];
		}
		else
		{
			if ( _pixelsInfo[i][0] < _pixelsTarget[i][0] )
				_pixelsValiation[i] = [0, 0, 0];
		}
	}
}


/**********************************************
 * 演出用LED制御点灯
 rgbR		[int]	: [0 - 255]赤
 rgbG		[int]	: [0 - 255]緑
 rgbB		[int]	: [0 - 255]青
 brightness [float]	: [0.0 - 1.0]輝度
 duration 	[float]	: [0.0 - ]継続時間[sec]
 **********************************************/
NeopixelLED.prototype.controlDirection = function( rgbR, rgbG, rgbB, brightness, duration )
{	
	// 最大値、最小値を求める
	var max = Math.max(Math.max(rgbR, rgbG), rgbB);
	var min = Math.min(Math.min(rgbR, rgbG), rgbB);

	// 色相を求める
	var hue = 0;
	if (max == min) hue = 0;
	else if (max == rgbR) hue = 60 * (rgbG - rgbB) / (max - min) + 0;
	else if (max == rgbG) hue = (60 * (rgbB - rgbR) / (max - min)) + 120;
	else hue = (60 * (rgbR - rgbG) / (max - min)) + 240;

	// 彩度を求める
	var saturation = 0;
	saturation = max - min;
	saturation = saturation / 255;
	
	//
	// HSV情報からRGB情報に変換し、変化量と目標値を設定
	for ( var i = 0, len = _ledDirectionNum; i < len; ++i )
		this.controlPixel( i, hue, saturation, brightness, duration );
};


/**********************************************
 * カメラ照明用LED制御
 rgbR		[int]	: [0 - 255]赤
 rgbG		[int]	: [0 - 255]緑
 rgbB		[int]	: [0 - 255]青
 brightness [float]	: [0.0 - 1.0]輝度
 duration 	[float]	: [0.0 - ]継続時間[sec]
 **********************************************/
NeopixelLED.prototype.controlCamLight = function( rgbR, rgbG, rgbB, brightness, duration )
{
	//
	// 最大値、最小値を求める
	var max = Math.max(Math.max(rgbR, rgbG), rgbB);
	var min = Math.min(Math.min(rgbR, rgbG), rgbB);

	//
	// 色相を求める
	var hue = 0;
	if (max == min) hue = 0;
	else if (max == rgbR) hue = 60 * (rgbG - rgbB) / (max - min) + 0;
	else if (max == rgbG) hue = (60 * (rgbB - rgbR) / (max - min)) + 120;
	else hue = (60 * (rgbR - rgbG) / (max - min)) + 240;

	//
	// 彩度を求める
	var saturation = 0;
	saturation = max - min;
	saturation = saturation / 255;

	//
	// HSVで処理
	this.controlCamLightHsv( hue, saturation, brightness, duration );
};


/**********************************************
 * カメラ照明用LED制御[HSV指定]
 hue 		[int]	: 色相 0 - 360
 saturation	[float]	: 彩度 0.0 - 1.0
 brightness	[float]	: 明度 0.0 - 1.0
 duration 	[float]	: 移行時間(sec) 0.0 -
 **********************************************/
NeopixelLED.prototype.controlCamLightHsv = function( hue, saturation, brightness, duration )
{
	//
	// カメラ照明用LED制御
	for ( var i = 0, len = _ledCamNum; i < len; ++i )
	{
		this.controlPixel( _ledDirectionNum + i, hue, saturation, brightness, duration );
	}
};


/**********************************************
 * カメラ照明用LEDを個別制御[RGB指定]
 n 			[int]	: 対象のLEDの通し番号(4つなら0,1,2,3) 0 -
 rgbR		[int]	: [0 - 255]赤
 rgbG		[int]	: [0 - 255]緑
 rgbB		[int]	: [0 - 255]青
 brightness [float]	: [0.0 - 1.0]輝度
 duration 	[float]	: [0.0 - ]継続時間[sec]
 **********************************************/
NeopixelLED.prototype.controlCamPixelRgb = function( n, rgbR, rgbG, rgbB, brightness, duration )
{
	//
	// 最大値、最小値を求める
	var max = Math.max(Math.max(rgbR, rgbG), rgbB);
	var min = Math.min(Math.min(rgbR, rgbG), rgbB);

	//
	// 色相を求める
	var hue = 0;
	if (max == min) hue = 0;
	else if (max == rgbR) hue = 60 * (rgbG - rgbB) / (max - min) + 0;
	else if (max == rgbG) hue = (60 * (rgbB - rgbR) / (max - min)) + 120;
	else hue = (60 * (rgbR - rgbG) / (max - min)) + 240;

	//
	// 彩度を求める
	var saturation = 0;
	saturation = max - min;
	saturation = saturation / 255;

	//
	// ピクセル操作
	this.controlPixel( _ledDirectionNum + n, hue, saturation, brightness, duration );
};


/**********************************************
 * カメラ照明用LEDを個別制御[HSV指定]
 n 			[int]	: 対象のLEDの通し番号(4つなら0,1,2,3) 0 -
 hue 		[int]	: 色相 0 - 360
 saturation	[float]	: 彩度 0.0 - 1.0
 brightness	[float]	: 明度 0.0 - 1.0
 duration 	[float]	: 移行時間(sec) 0.0 -
 **********************************************/
NeopixelLED.prototype.controlCamPixelHsv = function( n, hue, saturation, brightness, duration )
{
	//
	// ピクセル操作
	this.controlPixel( _ledDirectionNum + n, hue, saturation, brightness, duration );
};


/**********************************************
 * LEDピクセルを個別制御[HSV指定]
 n 			[int]	: 対象のLEDの通し番号 0 -
 hue 		[int]	: 色相 0 - 360
 saturation	[float]	: 彩度 0.0 - 1.0
 brightness	[float]	: 明度 0.0 - 1.0
 duration 	[float]	: 移行時間(sec) 0.0 -
 **********************************************/
NeopixelLED.prototype.controlPixel = function( n, hue, saturation, brightness, duration )
{
	//
	// HSV情報からRGB情報に変換し、変化量と目標値を設定
	var msduration = duration * 1000;
	var diff = 0;
	for ( var i = 0, len = 3; i < len; ++i )
	{
		//
		// 目標値を設定
		_pixelsTarget[n][i] = OPC.hsv(hue/360, saturation, brightness)[i];

		//
		// 差分を算出
		diff = _pixelsTarget[n][i] - _pixelsInfo[n][i];
		
		//
		// 変化量を設定
		// 1フレーム分の変化量を算出
		// 移行時間が0なら差分がそのまま変化量
		if ( msduration != 0 )
			_pixelsValiation[n][i] = diff / msduration * _setIntervalDelay;
		else
			_pixelsValiation[n][i] = diff;
	}
};


/**********************************************
 * 全開点灯
 **********************************************/
NeopixelLED.prototype.full = function()
{
	for ( var i = 0, len = _ledDirectionNum; i < len; ++i )
		this.controlDirection( 255, 255, 255, 1.0, 0.11 );
};


/**********************************************
 * 演出用LED消灯
 **********************************************/
NeopixelLED.prototype.off = function()
{
	for ( var i = 0, len = _ledDirectionNum; i < len; ++i )
		this.controlPixel( i, 0, 0, 0, 0.1 );
};


/**********************************************
 * すべてのLED消灯
 **********************************************/
NeopixelLED.prototype.allOff = function()
{
	for ( var i = 0, len = _ledTotalNum; i < len; ++i )
		this.controlPixel( i, 0, 0, 0, 0.1 );
};


module.exports = NeopixelLED;