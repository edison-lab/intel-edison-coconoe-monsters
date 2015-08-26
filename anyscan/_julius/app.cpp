#include <iostream>
#include <sstream>
#include <stdio.h>
#include <stdlib.h>
#include <julius/juliuslib.h>
#include <signal.h>


// 終了フラグ関連
volatile int _quitSigFlag = 0;
extern "C" void _quitSignalHandler(int signum);
extern "C" void _faultSignalHandler(int signum);

// 入力レベル取得用
int  _inputCount = 0;
long _totalInputLv = 0;
int  _maxInputLv = 0;
bool _clearFlag = false;

// Recog構造体
Recog *recog;


/**
 * [CALLBACK_POLL]
 * Juliusの毎フレームpolling時に実行されるcallback
 */
static void _callbackPolling( Recog *recog, void *dummy )
{
	// ZERO_CROSSの値を見てレベルを加算
	int currentLv = recog->adin->zc.level;
	_totalInputLv = _totalInputLv + currentLv;
	
	// 最大入力値
	if( _maxInputLv < currentLv ) {
		_maxInputLv = currentLv;
	}
	
	// インプット回数
	_inputCount++;
}



/**
 * [CALLBACK_EVENT_SPEECH_START]
 * speechが開始されたら実行されるコールバック
 */
static void _callbackSpeechStart( Recog *recog, void *dummy )
{
	_totalInputLv = 0;
	_inputCount = 0;
	_maxInputLv = 0;
}



/**
 * [CALLBACK_RESULT]
 * 結果取得時に呼ばれるコールバック
 */
static void _callBackGetResult( Recog *recog, void *dummy )
{
	RecogProcess *rProcess;
	WORD_INFO *winfo;
	Sentence *sentence;
	WORD_ID *seqW;
	int seqnum;
	
	// Recog構造体のプロセスを走査し、プロセスが生きているかチェック
	for( rProcess = recog->process_list; rProcess; rProcess = rProcess->next )
	{
		if ( !rProcess->live ) continue;
		if ( rProcess->result.status < 0 ) continue;
		
		winfo = rProcess->lm->winfo;
		
		bool inputFlag = false;
		std::stringstream words;
		std::stringstream confidences;
		
		for ( int n = 0; n < rProcess->result.sentnum; ++n )
		{
			sentence = &(rProcess->result.sent[n]);
			seqW = sentence->word;
			seqnum   = sentence->word_num;
			
			for ( int i = 0; i < seqnum; ++i )
			{
				inputFlag = true;
				
				words << "\"" << winfo->woutput[ seqW[i] ] << "\"";
				confidences << sentence->confidence[i];
				
				if(  i != seqnum - 1 )
				{
					words << ",";
					confidences << ",";
				}
				
				_clearFlag = true;
			}
		}
		
		// JSON構築して投げる
		if( inputFlag )
		{
			// 平均入力レベルを取得
			long averageLv = 0;
			if( _inputCount != 0 ) averageLv = _totalInputLv / _inputCount;
			
			std::cout << "{\"words\":[" << words.str() << "],\"confidences\":[" << confidences.str() << "],\"maxInputLv\":" << _maxInputLv << ",\"averageInputLv\":" << averageLv << ",\"duration\":" << _inputCount << "}" << std::endl;
		}
	}
}



/**
 * Main
 */
int main( int argc, char* argv[] )
{
	// 強制終了を拾う
	signal( SIGINT, _quitSignalHandler );
	signal( SIGSEGV, _faultSignalHandler);
	
	// 設定確保
	Jconf *jconf = j_config_load_args_new( argc, argv );
	
	// Recog構造体の確保
	recog = j_create_instance_from_jconf( jconf );
	
	// コールバック登録
	callback_add( recog, CALLBACK_POLL, _callbackPolling, NULL );
	callback_add( recog, CALLBACK_EVENT_SPEECH_START, _callbackSpeechStart, NULL );
	callback_add( recog, CALLBACK_RESULT, _callBackGetResult, NULL );
	
	// オーディオインプットを初期化
	j_adin_init( recog );
	j_recog_info( recog );
	
	// inputストリームを開く
	j_open_stream( recog, NULL );
	
	// 検出ループ
	int ret = j_recognize_stream( recog );
	if (ret == -1) return -1;
	
	// exit
	j_close_stream(recog);
	j_recog_free(recog);
	
	return 0;
}


/**
 * Ctrl+C時(など)に実行される
 */
extern "C" void _quitSignalHandler(int signum)
{
	std::cout << ">> _quitSignalHandler" << std::endl;
 
	if ( _quitSigFlag!=0 )
	{
		std::cout << "_quitSigFlag is already 0 @_quitSignalHandler" << std::endl;
		usleep( 250 * 1000 );
		std::cout << "exit..." << std::endl;
		exit(0);
	}
 
	_quitSigFlag = 1;
	
	j_close_stream( recog );
	j_recog_free( recog );
	
	std::cout << "CLOSE STREAM..." << std::endl;
	
	usleep( 250 * 1000 );
}


/**
 * セグメンテーションフォルト時に実行される
 */
extern "C" void _faultSignalHandler(int signum)
{
	std::cout << ">> _faultSignalHandler" << std::endl;
 
	if ( _quitSigFlag != 0)
	{
		std::cout << "_quitSigFlag is already 0 @_faultSignalHandler" << std::endl;
		usleep( 250 * 1000 );
		std::cout << "exit..." << std::endl;
		exit(0);
	}
 
	_quitSigFlag=1;
	
	j_close_stream( recog );
	j_recog_free( recog );
	
	std::cout << "[!]SEGMENTATION FAULT..." << std::endl;
	std::cout << "CLOSE STREAM..." << std::endl;
	
	usleep( 250 * 1000 );
}