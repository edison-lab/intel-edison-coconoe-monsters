var mraa = new require('mraa');

/**********************************************
 * 手かざしを検知するためのモジュール
 * 赤外線距離センサー GP2Y0E03
 * http://akizukidenshi.com/catalog/g/gI-07547/
 * ・測距範囲：4〜50cm
 * ・sensing()をsetInterval()にセットして下さい。
 * ・getValue()で5つの各センサーの値を取得することができます。
 **********************************************/


/*
	プロパティ
*/
var _sensorPin00;
var _sensorPin01;
var _sensorPin02;
var _sensorPin03;
var _sensorPin04;
var _value00 = 0;
var _value01 = 0;
var _value02 = 0;
var _value03 = 0;
var _value04 = 0;


/*
	コンストラクタ
*/
var IRDistanceSensor = function(sensorPin00Num, sensorPin01Num, sensorPin02Num, sensorPin03Num, sensorPin04Num){

	if (sensorPin00Num == null) sensorPin00Num = 0;
	if (sensorPin01Num == null) sensorPin01Num = 1;
	if (sensorPin02Num == null) sensorPin02Num = 2;
	if (sensorPin03Num == null) sensorPin03Num = 3;
	if (sensorPin04Num == null) sensorPin04Num = 4;

	_sensorPin00 = new mraa.Aio(sensorPin00Num);
	_sensorPin01 = new mraa.Aio(sensorPin01Num);
	_sensorPin02 = new mraa.Aio(sensorPin02Num);
	_sensorPin03 = new mraa.Aio(sensorPin03Num);
	_sensorPin04 = new mraa.Aio(sensorPin04Num);
};


/*
	値を出力メソッド
*/
IRDistanceSensor.prototype.getValue00 = function(){

	return _value00;
};
IRDistanceSensor.prototype.getValue01 = function(){

	return _value01;
};
IRDistanceSensor.prototype.getValue02 = function(){

	return _value02;
};
IRDistanceSensor.prototype.getValue03 = function(){

	return _value03;
};
IRDistanceSensor.prototype.getValue04 = function(){

	return _value04;
};


/*
	検知メソッド
	setInterval関数にセットして下さい。
*/
IRDistanceSensor.prototype.sensing = function(){

	var val00 = _sensorPin00.read();
	_value00 = val00;
	// _value00 = 0; // not ready
	var val01 = _sensorPin01.read();
	_value01 = val01;
	var val02 = _sensorPin02.read();
	_value02 = val02;
	var val03 = _sensorPin03.read();
	_value03 = val03;
	var val04 = _sensorPin04.read();
	_value04 = val04;
};


module.exports = IRDistanceSensor;