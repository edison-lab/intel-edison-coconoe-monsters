/**
 * Julius制御用JS
 */
var _process = require("child_process");
// var _exec	= _process.exec;
var _spawn		= _process.spawn;
var _running = false;
var _julius = null;
var _onDetectionHandler = null;


/**
 * Julius制御開始
 * @param onUpdate
 */
module.exports.start = function( cardID, subDeviceID, micLv, rejectShort, dictElem, onDetection )
{
	if( _running )
	{
		console.log("Julius is already running!");
		return "FAILED";
	}

	console.log("start Julius...");
	_running = true;
	_onDetectionHandler = onDetection;


	// Juliusのアプリを実行
	var juliusCommand = "./app";
	var cwd = { cwd:"/home/root/anyscan/_julius" };

	_julius = _spawn(
		juliusCommand
		,[
			 "-C" , "./julius.jconf"
			,"-lv" , String(micLv)
			,"-rejectshort" , String(rejectShort)
			,"-gram" , "./dict/commands_" + String( dictElem )
		 ]
		 ,cwd
	);

	// std::cout認識時に実行
	_julius.stdout.on( "data", function( data )
	{
		// 語句認識
		var str = String( data );

		if( str.search( "words" ) != -1 ) {
			if( _onDetectionHandler != null )
			{
				_onDetectionHandler(data);
			}
		}
	});

	// stdエラー時
	_julius.stderr.on( "data", function( data )
	{
		console.log( "[JULIUS]stdErr:" + data );
	});

	// 実行エラー時
	_julius.on( "error", function( err )
	{
		console.log( "[JULIUS]error:" + err );
	});

	// Close時
	_julius.on( "close", function( code )
	{
		console.log( "Julius is CLOSE: [code->]" + code );
	});

	return "SUCCESS";
};


/**
 * Juliusの制御停止
 * @param onDetection
 */
module.exports.stop = function()
{
	if( !_running ) {
		console.log( "Julius is already stopped." );
		return "FAILED";
	}

	_julius.kill('SIGINT');
	_running = false;
	_onDetectionHandler = null;

	return "SUCCESS";
};