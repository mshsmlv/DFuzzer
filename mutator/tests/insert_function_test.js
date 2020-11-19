function anotherFuntion() {
	var d = 10;
	console.log(d);
}

function functionFromAnotherFile() {
	console.log("this calls another function");
	anotherFuntion();
}

var a = [];
var k = 10;
for (var i = 8; i < 40; i ++) {
	a[k] = i;
	functionFromAnotherFile();
}
