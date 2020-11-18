function functionFromAnotherFile() {
	console.log("this function does something");
}

for (var i = 8; i < 40; i ++) {
	functionFromAnotherFile();
}
