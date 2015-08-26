#include <iostream>
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <fstream>
#include <sstream>
#include <opencv2/opencv.hpp>
#include <signal.h>
#include "picojson.h"


// カメラ関連
cv::VideoCapture _capture;

// プロジェクション関連
cv::Size _CAP_SIZE = cv::Size( 0, 0 );
cv::Size _PROJ_SIZE = cv::Size( 0, 0 );
cv::Mat _projMatrix;

// カメラ設定用コマンド
char *_brightnessCmd;
char *_contrastCmd;
char *_saturationCmd;
char *_gainCmd;
char *_whiteBalanceCmd;
char *_exposureCmd;
char *_focusCmd;

// 終了用シグナル
volatile int _quitSignal=0;

// 関数宣言
void _readJsonFile();
picojson::value::object _getJsonObject(std::string path);
extern "C" void quitSignalHandler(int signum);
extern "C" void faultSignalHandler(int signum);



/**
 * Main
 */
int main(int argc, char *argv[])
{
	// 終了検知
	signal( SIGINT,  quitSignalHandler );
	signal( SIGSEGV, faultSignalHandler);
	
	cv::Mat img;
	
	// JSONから設定Load
	_readJsonFile();
	
	_capture.open( 0 );
	_capture.set( CV_CAP_PROP_FRAME_WIDTH,  _CAP_SIZE.width );
	_capture.set( CV_CAP_PROP_FRAME_HEIGHT, _CAP_SIZE.height );
	_capture >> img;
	
	bool closeFlag = false;
	bool firstFlag = true;
	
	usleep( 16 * 1000 );
	
	while( !closeFlag )
	{
		if( firstFlag )
		{
			// 初回実行時のみカメラ設定反映
			system( _brightnessCmd );
			system( _contrastCmd );
			system( _saturationCmd );
			system( _gainCmd );
			system( _whiteBalanceCmd );
			system( _exposureCmd );
			system( _focusCmd );
			firstFlag = false;
		}
		
		_capture >> img;
		
		std::string cinData = "0";
		std::cout << "input_cin" << std::endl;
		std::cin >> cinData;
		
		// std::cout << "cin is" << cinData << std::endl;
		
		if( cinData == "updateConfig" )
		{
			// 設定JSONを読み込み直し、カメラ設定変更コマンドを叩く
			_readJsonFile();
			
			system( _brightnessCmd );
			system( _contrastCmd );
			system( _saturationCmd );
			system( _gainCmd );
			system( _whiteBalanceCmd );
			system( _exposureCmd );
			system( _focusCmd );
		}
		else if( cinData == "scan" || cinData == "scan_debug" )
		{
			if( cinData == "scan_debug" )
			{
				// キャプチャ前の画像を出力
				cv::imwrite( "../public/images/capture_img.png", img );
			}
			
			// プロジェクション変換 + 保存して終了
			cv::Mat projImg( _PROJ_SIZE, CV_8UC3 );
			cv::warpPerspective( img, projImg, _projMatrix, _PROJ_SIZE );
			
			cv::imwrite( "../public/images/proj_img.png", projImg );
			
			std::cout << "captured" << std::endl;
		}
		else if( cinData == "ignore" )
		{
			// std::cout << "ignore" << std::endl;
		}
		else
		{
			closeFlag = true;
			break;
		}
		
		usleep( 16 * 1000 );
	}
	
	_capture.release();
	
    return 0;
}


/**
 * コマンドを取得する
 */
char* _getCommand( std::string propName, int value )
{
	std::string cmdBase = "v4l2-ctl --set-ctrl=";
	std::stringstream sstr;
	
	sstr << cmdBase << propName << "=" << value;
	std::string cmdStr = sstr.str();
	
	// std::cout << "[CMD]:" << cmdStr << std::endl;
	
	int len = cmdStr.length();
	char* cmd = new char[len+1];
	memcpy( cmd, cmdStr.c_str(), len+1);
	
	return cmd;
}




/**
 * JSONから設定を読み込み
 */
void _readJsonFile()
{
	picojson::value::object jsonObj = _getJsonObject("");
	
	// picojsonでJSONをパース
	picojson::value::object &camConf = jsonObj["cameraConfigs"].get<picojson::object>();
	picojson::value::object &scanConf = jsonObj["scanConfigs"].get<picojson::object>();
	
	picojson::value::object &capSize = camConf["captureSize"].get<picojson::object>();
	_CAP_SIZE.width = (int)capSize["width"].get<double>();
	_CAP_SIZE.height = (int)capSize["height"].get<double>();
	
	picojson::value::object &cardSize = camConf["cardSize"].get<picojson::object>();
	_PROJ_SIZE.width = (int)cardSize["width"].get<double>();
	_PROJ_SIZE.height = (int)cardSize["height"].get<double>();
	
	// プロジェクション関連
	picojson::value::object &corners = scanConf["detectCorners"].get<picojson::object>();
	picojson::value::object &lT = corners["lt"].get<picojson::object>();
	picojson::value::object &lB = corners["lb"].get<picojson::object>();
	picojson::value::object &rT = corners["rt"].get<picojson::object>();
	picojson::value::object &rB = corners["rb"].get<picojson::object>();
	
	cv::Point2f dstPt[4];
	dstPt[0] = cv::Point2f((float)lT["x"].get<double>(), (float)lT["y"].get<double>());
	dstPt[1] = cv::Point2f((float)rT["x"].get<double>(), (float)rT["y"].get<double>());
	dstPt[2] = cv::Point2f((float)rB["x"].get<double>(), (float)rB["y"].get<double>());
	dstPt[3] = cv::Point2f((float)lB["x"].get<double>(), (float)lB["y"].get<double>());
	
	cv::Point2f srcPt[4];
	srcPt[0] = cv::Point2f( 0, 0 );
	srcPt[1] = cv::Point2f( _PROJ_SIZE.width, 0 );
	srcPt[2] = cv::Point2f( _PROJ_SIZE.width, _PROJ_SIZE.height );
	srcPt[3] = cv::Point2f( 0, _PROJ_SIZE.height );
	
	_projMatrix = cv::getPerspectiveTransform(dstPt, srcPt);
	
	//
	// カメラ設定(Logicool用)のコマンドを構築
	picojson::value::object &brightnessObj	= camConf["brightness"].get<picojson::object>();
	picojson::value::object &contrastObj	= camConf["contrast"].get<picojson::object>();
	picojson::value::object &saturationObj	= camConf["saturation"].get<picojson::object>();
	picojson::value::object &gainObj		= camConf["gain"].get<picojson::object>();
	picojson::value::object &whiteBalanceObj= camConf["white_balance_temperature"].get<picojson::object>();
	picojson::value::object &exposureObj	= camConf["exposure_absolute"].get<picojson::object>();
	picojson::value::object &focusObj		= camConf["focus_absolute"].get<picojson::object>();
	
	
	// (1)brightness
	_brightnessCmd = _getCommand( "brightness", (int)brightnessObj["value"].get<double>() );
	
	// (2)contrast
	_contrastCmd = _getCommand( "contrast", (int)contrastObj["value"].get<double>() );
	
	// (3)saturation
	_saturationCmd = _getCommand( "saturation", (int)saturationObj["value"].get<double>() );
	
	// (4)gain
	_gainCmd = _getCommand( "gain", (int)gainObj["value"].get<double>() );
	
	// (5)whiteBalance
	_whiteBalanceCmd = _getCommand( "white_balance_temperature", (int)whiteBalanceObj["value"].get<double>() );
	
	// (6)exposure
	_exposureCmd = _getCommand( "exposure_absolute", (int)exposureObj["value"].get<double>() );
	
	// (7)focus
	_focusCmd = _getCommand( "focus_absolute", (int)focusObj["value"].get<double>() );
}



/**
 * PICOJSONデータをファイルから読み込む
 */
picojson::value::object _getJsonObject( std::string path )
{
	// std::ifstream ifs( path, std::ios::in );
	std::ifstream ifs( "../public/configs/config.json" );
	std::istreambuf_iterator<char> it(ifs);
	std::istreambuf_iterator<char> last;
	
	std::string jsonStr(it, last);
	ifs.close();
	
	picojson::value v;
	const char* m(jsonStr.c_str());
	std::string err;
	
	picojson::parse( v, m, m + strlen(m), &err );
	
	if (!err.empty()) {
		std::cout << path << " / json parse error::" << err << std::endl;
	}
	
	picojson::value::object &jsonObj = v.get<picojson::object>();
	
	return jsonObj;
}



/**
 * Ctrl+C時(など)に実行
 */
extern "C" void quitSignalHandler(int signum)
{
	std::cout << ">> quitSignalHandler" << std::endl;
 
	if ( _quitSignal != 0 )
	{
		std::cout << "_quitSignal is already 0" << std::endl;
		exit(0);
	}
 
	_quitSignal=1;
	_capture.release();
	
	std::cout << "CLOSE CAPTURE..." << std::endl;
	usleep( 500 * 1000 );
	// exit(0);
}



/**
 * セグメンテーションフォルト時に実行
 */
extern "C" void faultSignalHandler(int signum)
{
	std::cout << ">> faultSignalHandler" << std::endl;
 
	if ( _quitSignal != 0 )
	{
		std::cout << "_quitSignal is already 0" << std::endl;
		exit(0);
	}
 
	_quitSignal=1;
	_capture.release();
	
	std::cout << "[Nooo!]SEGMENT FAULT..." << std::endl;
	std::cout << "CLOSE CAPTURE..." << std::endl;
	
	usleep( 500 * 1000 );
	// exit(0);
}

