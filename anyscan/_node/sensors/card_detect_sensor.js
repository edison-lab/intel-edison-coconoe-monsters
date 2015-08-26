var mraa = require('mraa');

/**********************************************
 * フォトインタラプタを使用してカードの挿入を検知するモジュール
 * sensing()をsetInterval()にセットして下さい。
 * getValue()でセンサーの値を取得することができます。
 * getAtate()でカードが入っているかどうかのbool値を取得することができます。
 **********************************************/


/*
	プロパティ
*/
var _sensorPin;
var _threshold;
var _hysteresis;
var _value = 0;
var _state = false;


/*
	コンストラクタ
*/
var CardDetectSensor = function(sensorPinNum, threshold, hysteresis){

	if (sensorPinNum == null) sensorPinNum = 1;
	if (threshold == null) _threshold = 10;
	else _threshold = threshold;
	if (hysteresis == null) _hysteresis = 2;
	else _hysteresis = hysteresis;

	_sensorPin = new mraa.Aio(sensorPinNum);
};


/*
	値出力メソッド
*/
CardDetectSensor.prototype.getValue = function(){

	return _value;
};


/*
	検知結果出力メソッド
*/
CardDetectSensor.prototype.getState = function(){

	return _state;
};


/*
	検知メソッド
	setInterval関数にセットしてください。
*/
CardDetectSensor.prototype.sensing = function(){

	_value = _sensorPin.read();
	this.judgement();
};


/*
	検出判定メソッド
*/
CardDetectSensor.prototype.judgement = function(){

	if (_value < (_threshold + _hysteresis))
	{
		_state = true;
	}
	else if (_value > (_threshold - _hysteresis))
	{
		_state = false;
	}
	else
	{
	}
};


module.exports = CardDetectSensor;