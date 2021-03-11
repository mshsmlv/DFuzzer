class MyClass {
	method() {
		console.log("do something");
		anotherFuntion1()
	}
}

function anotherFuntion1() {
	var v = 10;
	console.log(v);
}

function anotherFuntion() {
	var d = 10;
	console.log(d);
}

function functionFromAnotherFile() {
	console.log("this calls another function");
	anotherFuntion();
	asdf.method();
}

var aasdf = [];
var k = 10;
for (var i = 8; i < 40; i ++) {
	a[k] = i;
	functionFromAnotherFile();

	var m = new MyClass();
	m.method()

	var mapa = new Map();
}
